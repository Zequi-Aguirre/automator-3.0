# Database Migration Strategy

## Safe Migration Path (5 Stages)

**Philosophy**: Incremental, reversible migrations until final stage. Keep investors intact until new system is stable.

---

## Stage 1: Introduce Buyers Tables

**Migration File**: `postgres/migrations/YYYYMMDD_01_create_buyers_and_outcomes.sql`

**Risk**: Low (additive only)

```sql
-- Create buyers table with timing columns directly
CREATE TABLE buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    webhook_url TEXT NOT NULL,
    dispatch_mode VARCHAR(20) DEFAULT 'manual' CHECK (dispatch_mode IN ('manual', 'worker', 'both')),
    priority INTEGER NOT NULL UNIQUE,
    auto_send BOOLEAN DEFAULT false,
    allow_resell BOOLEAN DEFAULT true,
    requires_validation BOOLEAN DEFAULT false,

    -- Per-buyer timing (directly on buyers table)
    min_minutes_between_sends INTEGER DEFAULT 4,
    max_minutes_between_sends INTEGER DEFAULT 11,
    next_send_at TIMESTAMP WITH TIME ZONE,
    last_send_at TIMESTAMP WITH TIME ZONE,
    total_sends INTEGER DEFAULT 0,

    -- Flexible authentication
    auth_header_name VARCHAR(255) DEFAULT 'Authorization',
    auth_header_prefix VARCHAR(50),  -- e.g., 'Bearer' or NULL
    auth_token_encrypted TEXT,  -- Encrypted by application, not pgcrypto

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_buyers_priority ON buyers(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_buyers_auto_send ON buyers(auto_send, deleted_at) WHERE auto_send = true;
CREATE INDEX idx_buyers_dispatch_mode ON buyers(dispatch_mode, deleted_at);
CREATE INDEX idx_buyers_next_send ON buyers(next_send_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_buyers_deleted ON buyers(deleted_at);

-- Create many-to-many sold status table
CREATE TABLE lead_buyer_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES buyers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'sold',
    sold_at TIMESTAMP WITH TIME ZONE,
    sold_price NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Unique constraint: one outcome per lead-buyer pair
CREATE UNIQUE INDEX idx_lead_buyer_outcomes_unique
ON lead_buyer_outcomes(lead_id, buyer_id)
WHERE deleted_at IS NULL;

-- Indexes
CREATE INDEX idx_lead_buyer_outcomes_lead ON lead_buyer_outcomes(lead_id);
CREATE INDEX idx_lead_buyer_outcomes_buyer ON lead_buyer_outcomes(buyer_id);
CREATE INDEX idx_lead_buyer_outcomes_status ON lead_buyer_outcomes(status);
```

### Auth Token Encryption (Application-Level)

**Encryption Key Setup** (in Doppler):
```bash
# Add to Doppler secrets
BUYER_AUTH_ENCRYPTION_KEY=<32-byte-hex-string>
```

**Application-Level Encryption** (in Node.js):
```typescript
import crypto from 'crypto';

// In BuyerDAO.create()
function encryptToken(plaintext: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(key, 'hex'),
        iv
    );
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

// In BuyerDAO.getById()
function decryptToken(encrypted: string, key: string): string {
    const [ivHex, encryptedText] = encrypted.split(':');
    const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(key, 'hex'),
        Buffer.from(ivHex, 'hex')
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
```

---

## Stage 2: Extend Existing Tables

**Migration File**: `postgres/migrations/YYYYMMDD_02_extend_send_log_and_leads.sql`

**Risk**: Low (nullable, backward compatible)

### Add buyer_id to send_log (Append-Only Model)

```sql
-- Add buyer_id column (nullable for backward compatibility)
ALTER TABLE send_log
ADD COLUMN buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_send_log_buyer_id ON send_log(buyer_id);
CREATE INDEX idx_send_log_lead_buyer ON send_log(lead_id, buyer_id);
CREATE INDEX idx_send_log_buyer_created ON send_log(buyer_id, created_at DESC);

-- NO unique constraint - allow multiple attempts to same buyer
-- send_log is append-only audit trail
```

### Add worker_enabled to leads

```sql
-- Add worker control column
ALTER TABLE leads
ADD COLUMN worker_enabled BOOLEAN NOT NULL DEFAULT false;

-- Index for worker queries
CREATE INDEX idx_leads_worker_enabled ON leads(worker_enabled)
WHERE worker_enabled = true AND deleted_at IS NULL;
```

**Why Reuse send_log**:
- ✅ Already has all needed fields: `lead_id`, `status`, `response_code`, `response_body`, `payout_cents`
- ✅ Historical continuity (old `investor_id` sends + new `buyer_id` sends coexist)
- ✅ Append-only: Multiple attempts per (lead_id, buyer_id) are allowed
- ✅ UI shows latest attempt per buyer + full history

**Transition Period**:
- Old sends: `investor_id` populated, `buyer_id` NULL
- New sends: `buyer_id` populated, `investor_id` NULL (or mapped)
- Both columns coexist until Stage 5

---

## Stage 3: Migrate iSpeedToLead to Buyers

**Migration File**: `postgres/migrations/YYYYMMDD_03_add_ispeedtolead_buyer.sql`

**Risk**: Medium (data migration, requires env var)

**Prerequisites**:
- `LEAD_VENDOR_URL` must be in Doppler config
- Current `worker_settings.minutes_range_start/end` values known

```sql
-- Insert iSpeedToLead as first buyer (priority 6 = lowest/fallback)
DO $$
DECLARE
    ispeed_url TEXT := '<LEAD_VENDOR_URL>';  -- Replace with actual URL or use seed script
    min_minutes INT := 4;   -- From worker_settings.minutes_range_start
    max_minutes INT := 11;  -- From worker_settings.minutes_range_end
    ispeed_buyer_id UUID;
BEGIN
    -- Insert iSpeedToLead buyer
    INSERT INTO buyers (
        name,
        webhook_url,
        dispatch_mode,
        priority,
        auto_send,
        allow_resell,
        requires_validation,
        min_minutes_between_sends,
        max_minutes_between_sends,
        next_send_at,
        auth_header_name,
        auth_header_prefix,
        auth_token_encrypted
    )
    VALUES (
        'iSpeedToLead',
        ispeed_url,
        'worker',    -- Worker buyer (drip tier)
        6,           -- Lowest priority (fallback)
        true,        -- Auto-send enabled
        true,        -- Allow resell (since it's fallback)
        true,        -- Requires validation (current behavior)
        min_minutes,
        max_minutes,
        NOW(),       -- Immediately eligible for first send
        'Authorization',
        NULL,        -- No prefix (or adjust if needed)
        NULL         -- No auth token currently
    )
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO ispeed_buyer_id;

    -- Backfill send_log: map old investor sends to iSpeedToLead buyer
    IF ispeed_buyer_id IS NOT NULL THEN
        UPDATE send_log
        SET buyer_id = ispeed_buyer_id
        WHERE investor_id IS NOT NULL
          AND buyer_id IS NULL;
    END IF;

    RAISE NOTICE 'iSpeedToLead buyer created with ID: %', ispeed_buyer_id;
END $$;
```

**Validation After Migration**:
```sql
-- Verify buyer created
SELECT * FROM buyers WHERE name = 'iSpeedToLead';

-- Verify send_log backfill
SELECT COUNT(*) FROM send_log WHERE buyer_id IS NOT NULL;
```

---

## Stage 4: Switch Worker to Buyers (CODE DEPLOY)

**Migration File**: `postgres/migrations/YYYYMMDD_04_remove_global_send_timing.sql`

**Risk**: High (changes worker behavior)

**Prerequisites**:
- BuyerService, BuyerDispatchService, BuyerWebhookAdapter deployed
- Frontend buyers UI deployed
- Manual sends tested successfully

```sql
-- Remove global send timing from worker_settings
ALTER TABLE worker_settings DROP COLUMN IF EXISTS send_next_lead_at;

-- Remove old cooldown columns
ALTER TABLE worker_settings DROP COLUMN IF EXISTS delay_same_investor;
ALTER TABLE worker_settings DROP COLUMN IF EXISTS delay_same_county;
ALTER TABLE worker_settings DROP COLUMN IF EXISTS delay_same_state;
ALTER TABLE worker_settings DROP COLUMN IF EXISTS states_on_hold;

-- Keep these columns (still used globally):
-- - business_hours_start
-- - business_hours_end
-- - expire_after_hours
-- - cron_schedule
-- - worker_enabled
```

**Code Changes Required** (same deployment):
- `WorkerService.processAllBuyers()` implemented
- `BuyerDispatchService.processBuyerQueue()` implemented
- `SendLeadsJob` updated to call new methods
- `workerSettingsDAO` updated (remove deleted column references)
- Worker only processes leads where `worker_enabled=true`

**Rollback Plan**:
If worker fails after this migration:
1. Disable worker: `UPDATE worker_settings SET worker_enabled = false;`
2. Revert code to previous version (investors still exist in DB)
3. Re-enable worker with old code
4. Investigate and fix issues

---

## Stage 5: Remove Investors (FINAL, IRREVERSIBLE)

**Migration File**: `postgres/migrations/YYYYMMDD_05_remove_investors.sql`

**Risk**: ⚠️ **CRITICAL** - Irreversible without database backup

**Prerequisites**:
- Worker stable with buyers for **2+ weeks**
- All new buyers (Compass, Sellers, etc.) tested
- Manual and automated sends verified
- **DATABASE BACKUP CREATED**

```sql
-- ⚠️ POINT OF NO RETURN ⚠️

-- Drop investor reference from send_log
ALTER TABLE send_log DROP COLUMN IF EXISTS investor_id;

-- Drop vendor reference (if vendors table not used elsewhere)
ALTER TABLE send_log DROP COLUMN IF EXISTS vendor_id;

-- Drop investors table
DROP TABLE IF EXISTS investors;

-- Drop vendors table (if merging into buyers)
DROP TABLE IF EXISTS vendors;

-- Drop investor_id from leads (if not already removed)
ALTER TABLE leads DROP COLUMN IF EXISTS investor_id;
```

**Code Cleanup** (same deployment):
- Delete `investorDAO.ts`, `investorService.ts`, `investorResource.ts`
- Delete `iSpeedToLeadIAO.ts`
- Delete frontend investors section
- Remove `LEAD_VENDOR_URL` from `EnvConfig`

**Validation After Migration**:
```sql
-- Verify tables dropped
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('investors', 'vendors');
-- Should return empty

-- Verify send_log schema
\d send_log
-- Should NOT show investor_id or vendor_id columns

-- Verify worker still functioning
SELECT * FROM buyers WHERE auto_send = true ORDER BY priority;
SELECT * FROM send_log WHERE buyer_id IS NOT NULL ORDER BY created_at DESC LIMIT 10;
```

---

## Migration Rollback Strategies

### Before Stage 4 (Reversible)

**Rollback Steps**:
1. Buyers tables remain but are unused
2. Deploy previous code version (uses investors)
3. Worker continues using investors
4. No data loss

### After Stage 4, Before Stage 5 (Partial Rollback)

**Rollback Steps**:
1. Disable worker: `UPDATE worker_settings SET worker_enabled = false;`
2. Restore deleted columns:
   ```sql
   ALTER TABLE worker_settings ADD COLUMN send_next_lead_at TIMESTAMP WITH TIME ZONE;
   ALTER TABLE worker_settings ADD COLUMN delay_same_investor INTEGER DEFAULT 48;
   -- etc.
   ```
3. Deploy previous code version
4. Re-enable worker
5. Buyers tables remain but are ignored

### After Stage 5 (No Rollback)

**Only Option**: Restore from database backup taken before Stage 5 migration

**Recovery Steps**:
1. Stop application
2. Restore database from backup
3. Deploy previous code version
4. Restart application

---

## Pre-Migration Checklist

### Before Stage 1
- [ ] Review buyers table schema with team
- [ ] Add `BUYER_AUTH_ENCRYPTION_KEY` to Doppler (generate 64-char hex string)
- [ ] Implement encryption/decryption utilities in BuyerDAO

### Before Stage 3
- [ ] Verify `LEAD_VENDOR_URL` in Doppler
- [ ] Test manual buyer sends in staging
- [ ] Confirm iSpeedToLead webhook still works

### Before Stage 4
- [ ] Deploy all buyer infrastructure code
- [ ] Test frontend buyers UI
- [ ] Test manual sends to multiple buyers
- [ ] Test "Send to Worker" button functionality
- [ ] Load test worker with buyers (staging)

### Before Stage 5
- [ ] Worker stable for 2+ weeks in production
- [ ] All 6 buyers tested (Compass → iSpeedToLead)
- [ ] **Create database backup**
- [ ] Plan downtime window (if needed)
- [ ] Notify team of irreversible migration

---

## Timeline

| Stage | Risk | Estimated Time | Dependencies |
|-------|------|----------------|--------------|
| Stage 1 | Low | 1 hour | None |
| Stage 2 | Low | 1 hour | Stage 1 |
| Stage 3 | Medium | 2 hours | Stages 1-2, buyer code deployed |
| Stage 4 | High | 2 hours + testing | Stage 3, worker code deployed |
| Stage 5 | Critical | 1 hour | 2+ weeks after Stage 4 |

**Total Migration Time**: ~7 hours (plus 2+ weeks stabilization before Stage 5)
