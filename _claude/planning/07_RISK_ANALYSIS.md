# Risk Analysis & Edge Cases

## 1. Duplicate Sends

### Risk
Same lead sent to same buyer multiple times due to race conditions or retry logic.

### Impact
- Buyer receives duplicate data
- Wasted API calls
- Potential billing issues (if buyer charges per lead)
- Loss of buyer trust

### Mitigations

#### 1.1 Application-Level Validation
```typescript
async canSendToBuyer(lead: Lead, buyer: Buyer): Promise<boolean> {
    // Check if already sent successfully
    const alreadySent = await this.sendLogDAO.wasSuccessfullySentToBuyer(
        lead.id,
        buyer.id
    );
    if (alreadySent) return false;
    // ... other checks ...
}
```
- ✅ Application-level check before sending
- ✅ Allows retry attempts (send_log is append-only)
- ❌ Race condition possible between check and send (mitigated by row locking)

#### 1.2 Row-Level Locking
```sql
SELECT * FROM leads WHERE ... FOR UPDATE SKIP LOCKED;
```
- ✅ Prevents two workers from picking same lead
- ✅ PostgreSQL native, no cleanup needed
- ❌ Only helps with concurrent workers, not retry logic

#### 1.3 Sold Status Tracking
```sql
-- lead_buyer_outcomes table with unique constraint
UNIQUE(lead_id, buyer_id, deleted_at)
```
- ✅ Prevents duplicate outcome records
- ✅ Allows multiple send attempts (send_log is append-only)
- ✅ Tracks sold status separately from send attempts

### Recommendation
Use **all three mitigations** in combination for defense-in-depth:
1. Application-level validation (wasSuccessfullySentToBuyer check)
2. Row-level locking (FOR UPDATE SKIP LOCKED)
3. Unique constraint on outcomes table (prevents duplicate sold records)

---

## 2. Partial Pipeline Failures

### Scenario
Lead sent successfully to Buyer #1 (Compass), fails at Buyer #2 (Sellers), then succeeds at Buyer #3 (Pickle).

### Expected Behavior
- If Compass `allow_resell = false` → Stop pipeline (already sold)
- If Compass `allow_resell = true` → Continue to Sellers, Pickle, etc.
- Failure at Sellers should not block Pickle (retry Sellers later)

### Implementation
**In `BuyerDispatchService.getEligibleLeadsForBuyer()`**:
```typescript
async getEligibleLeadsForBuyer(buyerId: string): Promise<Lead[]> {
    // ... load leads ...

    // Check allow_resell logic for higher-priority buyers
    for (const lead of candidateLeads) {
        const isBlocked = await this.isLeadBlockedByHigherPriorityBuyer(
            lead.id,
            buyer.priority
        );
        if (isBlocked) {
            // Lead already sold to higher-priority buyer with allow_resell=false
            continue;
        }
        eligible.push(lead);
    }
}
```

### Edge Case: Buyer #2 Fails, Then Succeeds
**Timeline**:
1. 12:00 PM - Send to Sellers → 500 error
2. 12:05 PM - Retry send to Sellers → 200 success

**Result**: `send_log` has TWO entries for Sellers (one failed, one sent)

**Query Impact**: `wasSuccessfullySentToBuyer()` only checks for successful sends, so this works correctly.

**With Append-Only send_log**: This scenario is now fully supported. Multiple failed attempts are logged, and the successful retry is also logged. The validation logic checks for ANY successful send, preventing duplicate successful sends while allowing retries.

---

## 3. Concurrency Issues

### Risk
Worker running in multiple server instances (horizontal scaling) processes same buyer queue simultaneously.

### Impact
- Duplicate sends to same buyer
- Database lock contention
- Increased DB load

### Current Setup
- Single worker instance (worker enabled via DB flag)
- No horizontal scaling currently

### Future-Proofing: Advisory Locks

```typescript
async processBuyerQueue(buyerId: string): Promise<void> {
    const lockId = this.hashBuyerId(buyerId);
    const acquired = await this.db.oneOrNone(
        `SELECT pg_try_advisory_lock($1) AS acquired`,
        [lockId]
    );

    if (!acquired?.acquired) {
        console.log(`Buyer ${buyerId} locked by another worker`);
        return;
    }

    try {
        // ... process buyer queue ...
    } finally {
        await this.db.none(`SELECT pg_advisory_unlock($1)`, [lockId]);
    }
}
```

**When Needed**: Only if running multiple worker processes (future)

---

## 4. Retry Logic Complexity

### Scenario
Webhook call fails due to transient network error. Should we retry?

### Option A: Immediate Retry (Synchronous)
```typescript
async sendWithRetry(payload, maxRetries = 3): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await this.send(payload);
        } catch (error) {
            if (i < maxRetries - 1) await this.sleep(1000 * (i + 1));
        }
    }
}
```
**Pros**: Simple, immediate resolution
**Cons**: Blocks worker, could delay other buyers

### Option B: Deferred Retry (Asynchronous)
```sql
ALTER TABLE send_log ADD COLUMN retry_count INTEGER DEFAULT 0;
```
```typescript
// Worker checks for recent failures
const recentFailures = await this.sendLogDAO.getRecentFailures();
for (const log of recentFailures) {
    if (log.retry_count < 3) {
        await this.sendLeadToBuyer(log.lead_id, log.buyer_id);
    }
}
```
**Pros**: Non-blocking, better error handling
**Cons**: More complex, requires retry tracking

### Recommendation
Start with **Option A** (3 immediate retries with exponential backoff). Add **Option B** if needed.

---

## 5. Data Migration Rollback

### Risk
Migration to buyers fails mid-deployment, need to rollback.

### Stages & Rollback Difficulty

| Stage | Rollback Difficulty | Rollback Steps |
|-------|---------------------|----------------|
| Stage 1 (buyers table) | ✅ Easy | Buyers table unused, just delete rows |
| Stage 2 (timing on buyers) | ✅ Easy | Columns nullable, old code ignores them |
| Stage 3 (send_log.buyer_id) | ✅ Easy | Column nullable, old code ignores it |
| Stage 4 (lead_buyer_outcomes) | ✅ Easy | New table, old code doesn't use it |
| Stage 5 (iSpeedToLead buyer) | ⚠️ Medium | Need to clear buyer_id backfill in send_log |
| Stage 6 (worker switchover) | ⚠️ Medium | Restore deleted columns, revert code |
| Stage 7 (drop investors) | ❌ **HARD** | **Requires database backup restore** |

### Rollback Plan (Before Stage 7)
1. Disable worker: `UPDATE worker_settings SET worker_enabled = false;`
2. Restore deleted columns (if Stage 6 already executed)
3. Deploy previous code version
4. Re-enable worker
5. Investigate failures

### Point of No Return
**Stage 7** (dropping investors table) is irreversible without database backup.

**Required**: Create full database backup before executing Stage 7 migration.

---

## 6. Auth Token Security

### Risk
`auth_token` stored in plaintext → DB compromise exposes buyer credentials.

### Impact
- Attacker gains access to buyer webhooks
- Could send fake leads
- Could extract sensitive data from buyers
- Reputational damage

### Mitigations

#### 6.1 Application-Level Encryption
```typescript
// Use Node.js crypto module (AES-256-CBC)
import crypto from 'crypto';

export class EncryptionService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;

    constructor() {
        const keyString = process.env.DB_ENCRYPTION_KEY;  // 64 hex chars
        this.key = Buffer.from(keyString, 'hex');
    }

    encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    decrypt(encrypted: string): string {
        const [ivHex, encryptedText] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
```

**Pros**: Portable, no database dependencies, full control
**Cons**: Requires encryption key in environment

#### 6.2 Secrets Manager Integration
Store encryption key in Doppler/AWS Secrets Manager, not in code.

#### 6.3 Access Controls
- Limit DB access to only application user
- Use read-only replicas for analytics
- Never log `auth_token` or `auth_token_encrypted` in plaintext
- Store encrypted tokens in `auth_token_encrypted` column (plaintext tokens never persisted)

### Recommendation
Use **application-level encryption** (AES-256-CBC) + **Doppler** for key management.

---

## 7. Priority Conflicts

### Risk
Two buyers assigned same priority number → undefined send order.

### Impact
- Cannot determine which buyer gets lead first
- Unpredictable behavior
- Business logic errors

### Mitigation
```sql
ALTER TABLE buyers ADD CONSTRAINT unique_buyer_priority UNIQUE (priority);
```

**Frontend UX**: When admin creates buyer, show existing priorities and suggest next available.

---

## 8. Webhook Timeout Handling

### Risk
Buyer webhook hangs indefinitely, blocks worker.

### Current Mitigation
```typescript
await axios.post(url, payload, { timeout: 15000 });  // 15 seconds
```

### Edge Cases

#### 8.1 Buyer Returns 200 After 20 Seconds
**Current**: Timeout exception, logged as `failed`
**Problem**: Lead not sent, but buyer may have processed it

**Solution**: Make timeout configurable per buyer
```sql
ALTER TABLE buyers ADD COLUMN webhook_timeout_ms INTEGER DEFAULT 15000;
```

#### 8.2 Buyer Returns 200 with Error in Body
**Example**:
```json
{ "status": "success", "code": 200, "error": "Invalid phone number" }
```

**Current**: Logged as successful (200 status code)
**Problem**: Lead not actually accepted by buyer

**Solution**: Parse response body, check for error fields
```typescript
if (response.status === 200) {
    if (response.data.error || response.data.status === 'failed') {
        status = 'failed';
    }
}
```

### Recommendation
- Add `webhook_timeout_ms` column (configurable per buyer)
- Parse response body for error indicators

---

## 9. Performance Degradation

### Risk
`isLeadBlockedByHigherPriorityBuyer()` query becomes slow with large `send_log` table.

### Query
```sql
SELECT EXISTS (
    SELECT 1
    FROM send_log sl
    JOIN buyers b ON sl.buyer_id = b.id
    WHERE sl.lead_id = $1
      AND b.priority < $2
      AND b.allow_resell = false
      AND sl.status = 'sent'
      AND sl.response_code >= 200
      AND sl.response_code < 300
) AS is_blocked;
```

### Impact
- This query runs for EVERY lead during filtering
- With 100k send_log rows + 1000 active leads → expensive

### Mitigations

#### 9.1 Index Optimization
```sql
CREATE INDEX idx_send_log_lead_buyer_priority
ON send_log(lead_id, buyer_id)
INCLUDE (status, response_code);
```

#### 9.2 Caching
```typescript
// Cache blocked lead IDs per worker cycle
private blockedLeadCache = new Map<string, boolean>();

async isLeadBlockedByHigherPriorityBuyer(leadId: string, priority: number): Promise<boolean> {
    const cacheKey = `${leadId}:${priority}`;
    if (this.blockedLeadCache.has(cacheKey)) {
        return this.blockedLeadCache.get(cacheKey)!;
    }

    const isBlocked = await this.queryDatabase(leadId, priority);
    this.blockedLeadCache.set(cacheKey, isBlocked);
    return isBlocked;
}
```

#### 9.3 Denormalization
```sql
ALTER TABLE leads ADD COLUMN sold_to_buyer_id UUID REFERENCES buyers(id);
```
**Pros**: Fast lookup, single column index
**Cons**: Schema bloat, must keep in sync with send_log

### Recommendation
Use **Index Optimization** + **Caching**. Avoid denormalization unless performance critical.

---

## 10. Business Hours Edge Cases

### Scenario 1: Daylight Saving Time Transitions
**Example**: 2:00 AM → 3:00 AM (spring forward)
**Impact**: Worker skips 1 hour of sends if `business_hours_start = 120` (2:00 AM)

**Mitigation**: Use timezone-aware libraries (`luxon`, `moment-timezone`), already in use.

### Scenario 2: County Spans Multiple Timezones
**Example**: Nebraska (Central + Mountain time)
**Current**: County has single `timezone` value
**Problem**: Some leads in western Nebraska might be out of business hours

**Mitigation**: Accept imperfection OR split counties by timezone (not recommended, too complex).

### Scenario 3: Business Hours 24/7
**Example**: Set `business_hours_start = 0`, `business_hours_end = 1440` (24 hours)
**Current**: Should work, but never tested

**Recommendation**: Add integration test for 24/7 business hours.

---

## 11. Lead Expiration vs Buyer Timing

### Scenario
- Lead imported at 12:00 PM
- `expire_after_hours = 18`
- All buyers have `min_minutes_between_sends = 30`
- Lead will expire at 6:00 AM next day

**Risk**: Lead expires before all buyers have chance to send

**Current Behavior**: `TrashExpireLeadsJob` runs every 60 minutes, trashes expired leads

**Impact**: Lower-priority buyers (Andy, iSpeedToLead) may never see lead

**Mitigation Options**:
1. Increase `expire_after_hours` (e.g., 48 hours)
2. Decrease buyer timing (e.g., `min=2, max=5` minutes)
3. Accept that some leads won't reach all buyers (business decision)

**Recommendation**: Discuss with business stakeholders. Likely solution: **increase expire_after_hours to 48**.

---

## 12. CSV Import Without Investors

### Risk
Existing CSV import flows assign `investor_id` from CSV column. After refactor, this column is removed.

### Impact
- CSVs with `investor` column will fail validation OR silently ignore column
- Users may be confused

### Mitigation
**Option A**: Keep `investor` column in CSV, map to buyer
```typescript
// If CSV has investor column, ignore it with warning
if (parsedLead.investor_id) {
    console.warn(`Investor column deprecated, ignoring value: ${parsedLead.investor_id}`);
}
```

**Option B**: Remove `investor` from CSV parser entirely, update documentation

**Recommendation**: Use **Option A** (ignore with warning) for backward compatibility.

---

## 13. Worker Crash Recovery

### Scenario
Worker crashes mid-send (network error, OOM, etc.)

### Risk
- Lead locked in DB (FOR UPDATE)
- `buyer_schedule` not updated
- Send partially completed (logged to send_log but buyer didn't receive)

### Mitigation

#### 13.1 Transaction Management
```typescript
await this.db.tx(async (t) => {
    // Lock lead
    const lead = await t.one(`SELECT * FROM leads WHERE id = $1 FOR UPDATE`, [leadId]);

    // Send to buyer
    const response = await this.buyerWebhookAdapter.send(...);

    // Log to send_log
    await t.none(`INSERT INTO send_log ...`);

    // Update buyer_schedule
    await t.none(`UPDATE buyer_schedule ...`);
});
```
**Pros**: Atomic, rollback on failure
**Cons**: Webhook call inside transaction (not recommended)

#### 13.2 Idempotent Sends
- Buyer webhook should be idempotent (accept duplicate lead_id)
- Use `send_log.id` as idempotency key in webhook payload

#### 13.3 Lock Timeout
```sql
SET lock_timeout = '5s';  -- Release locks after 5 seconds
```

**Recommendation**: Use **idempotent sends** + **lock timeout** (not transactions around webhook calls).

---

## 14. Frontend Stale Data

### Risk
Admin views buyers list, another admin deletes buyer, first admin tries to send → 404 error.

### Mitigation
- Frontend polls buyers list every 30 seconds
- Show error message if buyer not found
- Refresh buyers list after send

---

## 15. Worker Gating Logic Issues

### Risk
`leads.worker_enabled` flag not properly synchronized with dispatch requirements.

### Scenarios

#### 15.1 Lead Marked worker_enabled=false But Worker Tries to Send
**Current**: Worker filters by `worker_enabled = true` in query
**Impact**: Lead never gets sent by worker (expected behavior)
**Mitigation**: Provide manual dispatch option for these leads

#### 15.2 Lead Should Be Worker-Only But Gets Manual Send
**Current**: No restriction on manual sends
**Impact**: Lead sent before worker cycle (may be unintended)
**Mitigation**: Add UI warning if manually sending worker-only lead

#### 15.3 dispatch_mode Conflicts
**Example**: Buyer has `dispatch_mode = 'worker'` but admin manually sends to them
**Current**: Manual send proceeds regardless of dispatch_mode
**Impact**: Inconsistent behavior
**Solution**: Respect dispatch_mode in manual send validation:
```typescript
async canManuallySendToBuyer(buyerId: string): Promise<boolean> {
    const buyer = await this.buyerDAO.getById(buyerId);
    if (buyer.dispatch_mode === 'worker') {
        throw new Error('This buyer only accepts automated worker sends');
    }
    return true;
}
```

### Recommendation
- Worker query filters by `worker_enabled = true`
- Manual sends ignore `worker_enabled` flag (admin override)
- Respect `dispatch_mode` in both manual and automated sends

---

## 16. Timing Columns on buyers Table

### Risk
`next_send_at`, `last_send_at`, `total_sends` columns become stale or out of sync.

### Scenarios

#### 16.1 next_send_at Not Updated After Send
**Impact**: Buyer sends too frequently or never sends again
**Mitigation**: Always update timing in `scheduleBuyerNext()`, called after every successful send

#### 16.2 Manual Send Updates Timing (Unintended)
**Current Design**: Manual sends DO NOT update `next_send_at`
**Rationale**: Manual sends shouldn't affect automated schedule
**Implementation**: Only call `scheduleBuyerNext()` from worker, not from manual send

#### 16.3 Database Transaction Failure
**Scenario**: Send succeeds, but timing update fails
**Impact**: Buyer sends again immediately (duplicate send risk)
**Mitigation**: Wrap timing update in same transaction as send_log insert (or use application retry logic)

### Recommendation
- Always update timing after worker sends (not manual sends)
- Use database transactions for critical updates
- Monitor `next_send_at` drift (alert if > 24 hours in future)

---

## 17. Append-Only send_log Performance

### Risk
Without unique constraints, `send_log` grows unbounded with retry attempts.

### Impact
- Large table size (disk space)
- Slower queries (even with indexes)
- wasSuccessfullySentToBuyer() scans more rows

### Mitigations

#### 17.1 Index Optimization
```sql
CREATE INDEX idx_send_log_lead_buyer_success
ON send_log(lead_id, buyer_id)
WHERE status = 'sent'
  AND response_code >= 200
  AND response_code < 300
  AND deleted_at IS NULL;
```
Partial index only on successful sends (smaller, faster)

#### 17.2 Log Retention Policy
```sql
-- Soft-delete logs older than 90 days
UPDATE send_log
SET deleted_at = NOW()
WHERE created_at < NOW() - INTERVAL '90 days'
  AND deleted_at IS NULL;
```

#### 17.3 Archival Strategy
Move old logs to separate archive table:
```sql
INSERT INTO send_log_archive
SELECT * FROM send_log
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM send_log
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Recommendation
- Implement log retention policy (90-day soft delete)
- Archive after 1 year (if needed)
- Monitor table size and query performance

---

## 18. Many-to-Many Sold Status Complexity

### Risk
`lead_buyer_outcomes` table adds complexity to sold status tracking.

### Scenarios

#### 18.1 Sold Status Out of Sync with send_log
**Example**: Lead marked sold in outcomes, but no successful send in send_log
**Impact**: Data integrity issue
**Mitigation**: Always create outcome record when send succeeds, update sold status separately

#### 18.2 Multiple Buyers Purchase Same Lead
**Example**: Lead sold to Compass AND Sellers (both `sold = true`)
**Current**: Supported by design (many-to-many)
**Impact**: Expected behavior if `allow_resell = true`
**Validation**: Check that all sold buyers have `allow_resell = true` OR are different priority levels

#### 18.3 Outcome Record Without send_log Entry
**Example**: Admin manually marks lead as sold, but it was never sent
**Impact**: Inconsistent data
**Mitigation**: Validate that `send_log_id` exists and links to successful send

### Recommendation
- Always create outcome record linked to send_log entry
- Validate sold status changes (require successful send first)
- Add database trigger to ensure referential integrity

---

## 19. Monitoring Blind Spots

### Current State
No APM/monitoring tools configured.

### Risks
- Worker silently failing (no alerts)
- Buyer webhooks timing out (no visibility)
- Database slow queries (no metrics)

### Recommendations
**Add Logging**:
- Buyer send attempts (success/failure rates per buyer)
- Per-buyer queue depths (how many leads waiting)
- Webhook response times
- `buyer_schedule` drift (is next_send_at getting too far in future?)

**Add Metrics** (future):
- Prometheus/Grafana for time-series data
- Alert on: success rate < 80%, response time > 5s, queue depth > 100

---

## Summary Table: Risk Severity

| Risk | Severity | Likelihood | Mitigation Priority |
|------|----------|------------|---------------------|
| Duplicate sends | High | Medium | P0 (Application validation + row locking) |
| Partial pipeline failures | Medium | High | P1 (allow_resell logic) |
| Concurrency issues | Medium | Low | P2 (Advisory locks) |
| Data migration rollback | High | Low | P0 (Database backup) |
| Auth token security | High | Low | P0 (Application-level encryption) |
| Priority conflicts | Medium | Low | P1 (Unique constraint) |
| Webhook timeouts | Medium | Medium | P2 (Configurable timeout) |
| Performance degradation | High | Medium | P1 (Index + cache) |
| Business hours DST | Low | Medium | P3 (Already handled) |
| Lead expiration timing | Medium | High | P1 (Increase expire hours) |
| Worker crash recovery | Medium | Low | P2 (Idempotent sends) |
| Worker gating logic issues | Medium | Medium | P1 (dispatch_mode validation) |
| Timing columns sync | Medium | Medium | P1 (Transaction wrapping) |
| Append-only send_log growth | Medium | High | P1 (Retention policy) |
| Many-to-many sold status | Medium | Low | P2 (Referential integrity) |
| Monitoring blind spots | High | High | P0 (Add logging) |
