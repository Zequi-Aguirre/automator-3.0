# Final Recommendations

## 1. Testing Strategy

### Unit Tests (Add During Implementation)

**Priority Tests**:
```typescript
// BuyerDispatchService
describe('BuyerDispatchService', () => {
  describe('canSendToBuyer', () => {
    it('should reject if buyer requires_validation but lead not verified')
    it('should reject if lead expired')
    it('should reject if outside business hours')
  })

  describe('isLeadBlockedByHigherPriorityBuyer', () => {
    it('should block if higher-priority buyer with allow_resell=false sold lead (check lead_buyer_outcomes)')
    it('should not block if higher-priority buyer with allow_resell=true')
    it('should not block if higher-priority buyer failed to send')
  })

  describe('scheduleBuyerNext', () => {
    it('should generate random delay between min and max minutes')
    it('should update buyer.next_send_at correctly')
  })
})

// WorkerService
describe('WorkerService', () => {
  describe('processAllBuyers', () => {
    it('should only process worker buyers (dispatch_mode IN ("worker","both"))')
    it('should only process leads where worker_enabled=true')
    it('should skip manual buyers (dispatch_mode="manual")')
  })
})
```

### Integration Tests

**Critical Flows**:
1. **Manual Send Flow (Manual Buyers)**:
   - Create buyer with dispatch_mode='manual' → Import lead → Verify lead → Send to buyer → Check send_log
2. **Worker Send Flow (Worker Buyers)**:
   - Create buyer with dispatch_mode='worker' → Import lead → Set worker_enabled=true → Enable worker → Verify send → Check send_log
3. **Priority Pipeline**:
   - Create 3 buyers (different priorities, different dispatch_modes) → Verify priority order → Verify dispatch_mode enforcement
4. **Sold Status**:
   - Send lead to buyer → Mark sold → Verify lead_buyer_outcomes record created → Verify allow_resell logic

### Load Tests (Before Production)

**Scenarios**:
- 100 leads, 6 buyers → Measure worker throughput
- 1000 send_log rows → Query performance for `isLeadBlockedByHigherPriorityBuyer()`
- Concurrent sends → Check for deadlocks, duplicate sends
- buyer.next_send_at update performance under load

---

## 2. Monitoring & Observability

### Logging Improvements

**Add Structured Logs**:
```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'buyer_send',
  buyer_id: buyerId,
  buyer_name: buyer.name,
  buyer_dispatch_mode: buyer.dispatch_mode,
  lead_id: leadId,
  lead_worker_enabled: lead.worker_enabled,
  status: 'success' | 'failed',
  response_code: 200,
  duration_ms: 345
}));
```

**Log Levels**:
- INFO: Successful sends, buyer timing updates, worker_enabled changes
- WARN: Webhook timeouts, business hours blocks, worker skips
- ERROR: Send failures, database errors, encryption errors

### Metrics to Track

**Per-Buyer Metrics**:
- Send success rate (last 24h, 7d, 30d)
- Average response time
- Queue depth (leads waiting)
- Last send timestamp
- Total sends count

**System Metrics**:
- Total sends per hour (manual vs worker)
- Pipeline conversion rate (Compass → iSpeedToLead)
- Lead expiration rate
- worker_enabled=true lead count
- lead_buyer_outcomes growth rate

### Alerting Rules

**Critical Alerts** (PagerDuty/Slack):
- Worker hasn't sent in 30 minutes (when worker_enabled=true leads available)
- Buyer success rate < 50% (in last hour)
- Database connection failures
- Encryption/decryption errors

**Warning Alerts**:
- Buyer success rate < 80% (in last 4 hours)
- Webhook response time > 5 seconds
- Queue depth > 100 worker_enabled=true leads for any buyer
- buyer.next_send_at not updating

---

## 3. Documentation Updates

### Update Existing Docs

**CLAUDE.md**:
```markdown
## Buyer Pipeline

**Two-Lane Dispatch**:

### Manual Buyers (Top Tier)
- Compass (priority 1)
- Sellers (priority 2)
- Pickle (priority 3)

Sent manually from UI when admin clicks "Send to Buyer".

### Worker Buyers (Drip/Lower Tier)
- Motivated (priority 4)
- Andy (priority 5)
- iSpeedToLead (priority 6, fallback)

Sent automatically by worker when lead.worker_enabled=true.

**Worker Gating**: Worker only processes leads where worker_enabled=true. Set via "Send to Worker" button in UI.

**Timing**: Each buyer has independent timing via next_send_at column (no separate schedule table).

**Sold Status**: Many-to-many via lead_buyer_outcomes table. Sold toggle creates outcome record.
```

**docs/AI/BASELINE/ARCHITECTURE.md**:
- Replace investor references with buyers
- Document two-lane dispatch system
- Document `BuyerDispatchService` orchestrator pattern
- Document worker_enabled gating logic
- Explain per-buyer scheduling (timing columns on buyers table)

**docs/AI/BASELINE/DAO_CONTRACT.md**:
- Add `BuyerDAO` and `LeadBuyerOutcomeDAO`
- Update `SendLogDAO` methods
- Document encryption/decryption utilities in BuyerDAO

**docs/AI/SERVICE_BEHAVIOR_SUMMARY.md**:
- Document `BuyerDispatchService` methods
- Update `WorkerService` behavior (worker gating)

### Create New Docs

**docs/AI/BUYERS_GUIDE.md**:
```markdown
# Buyers Configuration Guide

## Adding a New Buyer

1. Go to Admin → Buyers
2. Click "Add Buyer"
3. Fill in:
   - Name: Buyer display name
   - Webhook URL: Full URL to buyer's endpoint
   - Dispatch Mode: manual | worker | both
   - Auth Header Name: Custom header name (default: "Authorization")
   - Auth Header Prefix: Prefix for token (e.g., "Bearer ", or leave blank)
   - Auth Token: Encrypted token
   - Priority: Unique number (1 = highest)
   - Auto Send: Enable for worker automation (worker buyers only)
   - Allow Resell: If false, stops pipeline after successful sale
   - Requires Validation: If true, only send verified leads
   - Min/Max Minutes: Timing range for automated sends (worker buyers only)

## Testing a New Buyer

### Manual Buyers
1. Set dispatch_mode='manual', auto_send=false
2. Import test lead
3. Manual send via lead detail modal
4. Verify response in send_log
5. Monitor for 24 hours

### Worker Buyers
1. Set dispatch_mode='worker', auto_send=true
2. Import test lead
3. Set worker_enabled=true via "Send to Worker" button
4. Enable worker
5. Verify automated send
6. Monitor for 24 hours

## Auth Types

### Custom (Flexible Headers)
Used for: Any authentication requiring custom header names
Header: `{auth_header_name}: {auth_header_prefix}{token}`
Example: `X-API-Key: secret123` (name="X-API-Key", prefix=NULL, token="secret123")
Example: `Authorization: Bearer abc123` (name="Authorization", prefix="Bearer ", token="abc123")

## Sold Status

Mark lead as sold to specific buyer using sold toggle in buyer modal.
Creates lead_buyer_outcome record.
If buyer has allow_resell=false, pipeline stops for lower-priority buyers.
```

---

## 4. Security Hardening

### Auth Token Encryption (Application-Level)

**Recommended Setup**:
```typescript
import crypto from 'crypto';

// In BuyerDAO or separate EncryptionService
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(keyHex: string) {
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encrypted: string): string {
    const [ivHex, encryptedText] = encrypted.split(':');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(ivHex, 'hex')
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

**Doppler Configuration**:
- Add `BUYER_AUTH_ENCRYPTION_KEY` to Doppler (generate 64-char hex string: `openssl rand -hex 32`)
- Rotate key annually
- Document key rotation procedure

### Secrets Management

**Never Log**:
- `auth_token_encrypted` values (plaintext)
- Full webhook URLs (log domain only)
- Lead phone/email (mask in logs)

**Access Controls**:
- Limit DB access to application user only
- Use read-only replicas for analytics
- Implement row-level security (RLS) if needed

---

## 5. Performance Optimization

### Database Indexes

**Critical Indexes**:
```sql
-- Buyer queries
CREATE INDEX idx_buyers_priority ON buyers(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_buyers_dispatch_mode ON buyers(dispatch_mode, deleted_at);
CREATE INDEX idx_buyers_next_send ON buyers(next_send_at) WHERE deleted_at IS NULL;

-- Lead queries
CREATE INDEX idx_leads_worker_enabled ON leads(worker_enabled) WHERE worker_enabled = true AND deleted_at IS NULL;

-- Send log queries
CREATE INDEX idx_send_log_lead_buyer ON send_log(lead_id, buyer_id);
CREATE INDEX idx_send_log_lead_buyer_priority
ON send_log(lead_id, buyer_id)
INCLUDE (status, response_code);

-- Lead buyer outcomes
CREATE INDEX idx_lead_buyer_outcomes_lead ON lead_buyer_outcomes(lead_id);
CREATE INDEX idx_lead_buyer_outcomes_status ON lead_buyer_outcomes(status);

-- Lead filtering
CREATE INDEX idx_leads_buyer_eligibility
ON leads(worker_enabled, verified, sent, deleted_at, created)
WHERE deleted_at IS NULL;
```

### Query Optimization

**Slow Query**: `isLeadBlockedByHigherPriorityBuyer()` (checks lead_buyer_outcomes)

**Solution**: Cache per worker cycle
```typescript
private blockedLeadCache = new Map<string, boolean>();

async isLeadBlockedByHigherPriorityBuyer(leadId: string, priority: number): Promise<boolean> {
  const cacheKey = `${leadId}:${priority}`;
  if (this.blockedLeadCache.has(cacheKey)) {
    return this.blockedLeadCache.get(cacheKey)!;
  }
  const result = await this.queryDB(leadId, priority);
  this.blockedLeadCache.set(cacheKey, result);
  return result;
}
```

**Clear cache after each worker cycle**

---

## 6. Operational Runbook

### Common Issues & Solutions

#### Issue: Worker Not Sending

**Diagnosis**:
```sql
-- Check worker enabled
SELECT worker_enabled, cron_schedule FROM worker_settings;

-- Check buyer timing
SELECT
  b.name,
  b.dispatch_mode,
  b.auto_send,
  b.next_send_at,
  b.last_send_at
FROM buyers b
WHERE b.deleted_at IS NULL
ORDER BY b.priority;

-- Check eligible leads
SELECT COUNT(*) FROM leads
WHERE worker_enabled = true
  AND verified = true
  AND sent = false
  AND deleted_at IS NULL;
```

**Solutions**:
1. Enable worker: `UPDATE worker_settings SET worker_enabled = true;`
2. Check buyer `auto_send=true` and `dispatch_mode IN ('worker','both')`
3. Check `next_send_at` not too far in future
4. Check leads have `worker_enabled=true`
5. Restart backend to reinitialize worker

#### Issue: Duplicate Sends

**Diagnosis**:
```sql
-- Find duplicates in send_log (expected due to append-only design)
SELECT lead_id, buyer_id, COUNT(*)
FROM send_log
WHERE deleted_at IS NULL
GROUP BY lead_id, buyer_id
HAVING COUNT(*) > 1;

-- Find unexpected duplicates in lead_buyer_outcomes
SELECT lead_id, buyer_id, COUNT(*)
FROM lead_buyer_outcomes
WHERE deleted_at IS NULL
GROUP BY lead_id, buyer_id
HAVING COUNT(*) > 1;
```

**Solutions**:
1. send_log duplicates are EXPECTED (append-only design, allows retries)
2. lead_buyer_outcomes duplicates are UNEXPECTED - check unique constraint exists
3. Investigate race conditions in logs
4. Add advisory locks if running multiple workers

#### Issue: Buyer Webhooks Timing Out

**Diagnosis**:
```sql
SELECT
  b.name,
  COUNT(*) FILTER (WHERE sl.response_code = 0) AS timeouts,
  AVG(EXTRACT(EPOCH FROM (sl.modified_at - sl.created_at)) * 1000) AS avg_duration_ms
FROM send_log sl
JOIN buyers b ON sl.buyer_id = b.id
WHERE sl.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY b.name;
```

**Solutions**:
1. Contact buyer to check endpoint health
2. Temporarily disable `auto_send` for problematic buyer
3. Check buyer.next_send_at to verify timing

#### Issue: Manual Send Blocked for Worker Buyer

**Diagnosis**:
```sql
-- Check buyer dispatch_mode
SELECT name, dispatch_mode, priority FROM buyers WHERE id = '<buyer_id>';
```

**Solutions**:
1. This is EXPECTED behavior - worker buyers cannot be sent manually
2. If buyer should support both, change dispatch_mode to 'both'
3. Use "Send to Worker" button instead

---

## 7. Rollback Procedures

### Emergency Rollback (Sprint 4 Failure)

**If worker fails after deployment**:

1. **Disable worker immediately**:
   ```sql
   UPDATE worker_settings SET worker_enabled = false;
   ```

2. **Check what broke**:
   - View server logs
   - Check recent send_log entries
   - Check buyer timing columns

3. **Rollback code**:
   - Deploy previous git commit
   - Restart backend

4. **Restore DB columns** (if migration #24 already ran):
   ```sql
   ALTER TABLE worker_settings ADD COLUMN send_next_lead_at TIMESTAMP;
   ALTER TABLE worker_settings ADD COLUMN delay_same_investor INTEGER DEFAULT 48;
   ALTER TABLE worker_settings ADD COLUMN delay_same_county INTEGER DEFAULT 36;
   ```

5. **Re-enable worker**:
   ```sql
   UPDATE worker_settings SET worker_enabled = true;
   ```

6. **Verify old system working**:
   - Check logs for sends
   - Monitor for 1 hour

### Data Recovery (Sprint 6 Failure)

**If migration #33 fails or causes issues**:

1. **Stop application immediately**
2. **Restore from backup** (created before migration):
   ```bash
   pg_restore -d automator_db backup_before_stage5.dump
   ```
3. **Deploy previous code version**
4. **Restart application**
5. **Verify data integrity**

---

## 8. Future Enhancements (Post-Launch)

### Phase 2 Features

**Deferred Retry Logic**:
- Add `retry_count` column to `send_log`
- Worker checks for recent failures
- Retry failed sends after N minutes

**Buyer Analytics Dashboard**:
- Success rate charts (per buyer, per dispatch_mode)
- Pipeline conversion funnel
- Revenue tracking (payout_cents)
- worker_enabled conversion rate

**Dynamic Priority**:
- Allow changing buyer priority without restart
- A/B test different buyer orders

**Lead Routing Rules**:
- Route specific counties to specific buyers
- Route by lead source (affiliate/campaign)
- Route by dispatch_mode preference

**Webhook Response Parsing**:
- Extract payout from different response formats
- Detect partial failures (200 with error)

---

## 9. Key Decisions Summary

| Decision | Chosen Approach | Alternative | Rationale |
|----------|-----------------|-------------|-----------|
| Buyer timing storage | Columns on `buyers` table | Separate `buyer_schedule` table | Simpler schema, fewer joins, one less table to manage |
| Sold status tracking | `lead_buyer_outcomes` table (many-to-many) | `lead.sold_buyer_id` | Allows tracking multiple buyers who purchased same lead |
| Worker gating | `leads.worker_enabled` flag | Always process all leads | Explicit user control over which leads enter worker pipeline |
| Dispatch lanes | `dispatch_mode` column ('manual'/'worker'/'both') | Single unified approach | Clear separation of manual (high-value) vs worker (drip) buyers |
| Auth token encryption | Application-level (Node crypto) | pgcrypto (database) | More portable, no DB extension dependency |
| Flexible auth headers | `auth_header_name` + `auth_header_prefix` | Fixed header names | Supports vendors with non-standard auth headers |
| Send log design | Append-only (allows retries) | Unique constraint (one send) | Allows manual retry attempts, better audit trail |
| allow_resell implementation | Query `lead_buyer_outcomes` | Query `send_log` | Distinguishes "sent" from "sold", clearer semantics |
| Concurrency control | FOR UPDATE SKIP LOCKED | Advisory locks | PostgreSQL native, no cleanup |

---

## 10. Success Criteria (Final)

### Technical Success
- [ ] All 6 buyers configured and sending
- [ ] Two-lane dispatch working (manual + worker)
- [ ] Worker stable for 30+ days
- [ ] Worker only processes worker_enabled=true leads
- [ ] Zero data loss during migration
- [ ] < 0.1% duplicate send rate (excluding intentional retries)
- [ ] Average send latency < 2 seconds
- [ ] 99.9% worker uptime

### Business Success
- [ ] Higher lead monetization (multiple buyers)
- [ ] Faster lead distribution (concurrent sends)
- [ ] Reduced manual work (automated priority pipeline for worker buyers)
- [ ] Better buyer relationships (dedicated configs)
- [ ] Clear manual vs worker separation

### Team Success
- [ ] Clear documentation for adding new buyers
- [ ] Runbook for common issues
- [ ] Monitoring alerts for failures
- [ ] Code maintainability improved
- [ ] Understanding of two-lane dispatch model
