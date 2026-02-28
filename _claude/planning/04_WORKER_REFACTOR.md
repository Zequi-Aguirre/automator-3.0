# Worker Refactor Strategy

## Current Worker Behavior

**File**: `server/src/main/worker/Worker.ts`, `server/src/main/worker/jobs/SendLeadsJob.ts`

**Current Logic**:
1. Cron runs on schedule (e.g., `* * * * *` = every minute)
2. Check global `worker_settings.send_next_lead_at`
3. If time hasn't arrived, skip
4. If time arrived:
   - Pick ONE lead globally (random from filtered set)
   - Send to iSpeedToLead
   - Schedule next global send: `NOW() + random(min_range, max_range)`

**Problems**:
- ❌ Only one lead sent per cron tick
- ❌ Global timing prevents multi-buyer parallelism
- ❌ Hardcoded to iSpeedToLead

---

## New Worker Behavior

**New Logic**:
1. Cron runs on schedule (unchanged)
2. **For EACH buyer** with `auto_send=true`:
   - Check that buyer's `buyer_schedule.next_send_at`
   - If time arrived for this buyer:
     - Pick one lead eligible for this buyer
     - Send to buyer's webhook
     - Schedule next send for this buyer independently

**Benefits**:
- ✅ Multiple buyers can send concurrently
- ✅ Per-buyer timing (Compass sends every 5-10 min, iSpeedToLead every 4-11 min)
- ✅ Priority-based lead selection
- ✅ Vendor-agnostic

---

## 1. Per-Buyer Scheduling State

### Storage: Timing Directly on buyers Table

**Schema** (added to buyers table):
```sql
ALTER TABLE buyers
ADD COLUMN next_send_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_send_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_sends INTEGER DEFAULT 0;
```

**Initialization**: When buyer is created
```sql
-- next_send_at defaults to NULL (immediately eligible)
-- Or set to NOW() for immediate eligibility
INSERT INTO buyers (name, webhook_url, next_send_at, ...)
VALUES ('Compass', 'https://api.compass.com/leads', NOW(), ...);
```

**Update After Send**:
```typescript
async scheduleBuyerNext(buyerId: string): Promise<void> {
    const buyer = await this.buyerDAO.getById(buyerId);
    const randomMinutes = Math.floor(
        Math.random() * (buyer.max_minutes_between_sends - buyer.min_minutes_between_sends + 1)
    ) + buyer.min_minutes_between_sends;

    const nextSendAt = new Date();
    nextSendAt.setMinutes(nextSendAt.getMinutes() + randomMinutes);

    await this.buyerDAO.updateTiming(buyerId, {
        next_send_at: nextSendAt,
        last_send_at: new Date(),
        total_sends: buyer.total_sends + 1
    });
}
```

---

## 2. Worker Gating: leads.worker_enabled

**New Column**: `leads.worker_enabled BOOLEAN DEFAULT TRUE`

**Purpose**: Control which leads are processed by the worker vs manual-only dispatch

**Usage**:
```typescript
// In BuyerDispatchService.getEligibleLeadsForBuyer()
async getEligibleLeadsForBuyer(buyerId: string): Promise<Lead[]> {
    const buyer = await this.buyerDAO.getById(buyerId);

    // Base query with worker_enabled filter
    const query = `
        SELECT l.*
        FROM leads l
        WHERE l.deleted_at IS NULL
          AND l.worker_enabled = true  -- Only worker-eligible leads
          AND l.verified = true
          AND NOT EXISTS (
              SELECT 1 FROM send_log sl
              WHERE sl.lead_id = l.id
                AND sl.buyer_id = $1
                AND sl.deleted_at IS NULL
          )
        ORDER BY l.created ASC
        LIMIT 100
    `;

    const candidateLeads = await this.leadDAO.getLeadsForBuyer(buyerId);
    // ... additional filtering ...
    return filteredLeads;
}
```

**Two-Lane Dispatch**:
- **Manual buyers** (Compass, Sellers, Pickle): `dispatch_mode = 'manual'` or `'both'`
  - Receive leads regardless of `worker_enabled` flag
  - Dispatched via frontend "Send to Buyer" button
- **Worker buyers** (Motivated, Andy, iSpeedToLead): `dispatch_mode = 'worker'` or `'both'`
  - Only receive leads where `worker_enabled = true`
  - Dispatched automatically by worker

**Buyers Table Schema**:
```sql
ALTER TABLE buyers
ADD COLUMN dispatch_mode VARCHAR(10) DEFAULT 'both'
CHECK (dispatch_mode IN ('manual', 'worker', 'both'));
```

**Worker Filter** (in `WorkerService.processAllBuyers()`):
```typescript
async processAllBuyers(): Promise<void> {
    // Get buyers with auto_send=true AND dispatch_mode IN ('worker', 'both')
    const buyers = await this.buyerService.getAutoSendBuyers();

    for (const buyer of buyers) {
        if (buyer.dispatch_mode === 'manual') {
            console.log(`Skipping manual-only buyer: ${buyer.name}`);
            continue;
        }

        await this.buyerDispatchService.processBuyerQueue(buyer.id);
    }
}
```

---

## 3. Random Delay Calculation

**Location**: `BuyerDispatchService.scheduleBuyerNext()`

**Algorithm**:
```typescript
// Generate random integer between min and max (inclusive)
const randomMinutes = Math.floor(
    Math.random() * (max_minutes_between_sends - min_minutes_between_sends + 1)
) + min_minutes_between_sends;

// Example: min=4, max=11
// Possible values: 4, 5, 6, 7, 8, 9, 10, 11 (uniform distribution)
```

**Scheduling**:
```typescript
const nextSendAt = new Date();
nextSendAt.setMinutes(nextSendAt.getMinutes() + randomMinutes);

// Update timing directly on buyers table
await this.buyerDAO.updateTiming(buyerId, {
    next_send_at: nextSendAt,
    last_send_at: new Date(),
    total_sends: buyer.total_sends + 1
});
```

**Example Timeline** (Compass: min=5, max=10):
```
12:00 PM - Send lead #1 → schedule next at 12:07 PM (random: 7 min)
12:07 PM - Send lead #2 → schedule next at 12:12 PM (random: 5 min)
12:12 PM - Send lead #3 → schedule next at 12:21 PM (random: 9 min)
12:21 PM - Send lead #4 → schedule next at 12:31 PM (random: 10 min)
```

---

## 4. Worker Anti-Spam Logic

### Problem
Multiple buyers processing simultaneously could:
1. Send same lead to different buyers at same time ✅ OKAY (priority pipeline)
2. Send same lead to SAME buyer twice ❌ NOT OKAY

### Solution: Row-Level Locking

**Use PostgreSQL `FOR UPDATE SKIP LOCKED`**:

```typescript
// In LeadDAO
async getLeadsForBuyerWithLock(buyerId: string): Promise<Lead[]> {
    const query = `
        SELECT l.*
        FROM leads l
        WHERE l.deleted_at IS NULL
          AND l.verified = true
          AND l.sent = false
          AND NOT EXISTS (
              SELECT 1 FROM send_log sl
              WHERE sl.lead_id = l.id
                AND sl.buyer_id = $1
                AND sl.deleted_at IS NULL
          )
        ORDER BY l.created ASC
        LIMIT 100
        FOR UPDATE SKIP LOCKED  -- Skip leads locked by other transactions
    `;
    return await this.db.manyOrNone<Lead>(query, [buyerId]);
}
```

**How It Works**:
- `FOR UPDATE`: Lock selected rows
- `SKIP LOCKED`: If row already locked, skip it (don't wait)
- Result: Each worker process gets different leads, no contention

**Usage in BuyerDispatchService**:
```typescript
async getEligibleLeadsForBuyer(buyerId: string): Promise<Lead[]> {
    // This query already locks leads, preventing duplicates
    const candidateLeads = await this.leadDAO.getLeadsForBuyerWithLock(buyerId);

    // Apply additional filters (business hours, allow_resell, etc.)
    // ...

    return filteredLeads;
}
```

---

## 5. Business Hours Enforcement (Global)

**Unchanged**: Business hours remain global (same for all buyers)

**Location**: `BuyerDispatchService.canSendToBuyer()`

**Implementation**:
```typescript
async canSendToBuyer(lead: Lead, buyer: Buyer): Promise<boolean> {
    // ... other checks ...

    // Business hours check (county timezone)
    const county = await this.countyService.getById(lead.county_id);
    const settings = await this.workerSettingsDAO.getCurrentSettings();

    const localMinute = this.getCountyLocalMinute(county.timezone);

    if (localMinute < settings.business_hours_start ||
        localMinute >= settings.business_hours_end) {
        return false;  // Outside business hours
    }

    return true;
}

private getCountyLocalMinute(timezone: string): number {
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    return localTime.getHours() * 60 + localTime.getMinutes();
}
```

**Example**:
- `business_hours_start = 360` (6:00 AM)
- `business_hours_end = 1380` (11:00 PM)
- County timezone: `America/New_York`
- Current UTC: 2:00 PM
- NY local time: 9:00 AM → 540 minutes
- Check: 540 >= 360 AND 540 < 1380 → ✅ PASS

---

## 6. Updated Worker Files

### 6.1 Worker.ts (Minimal Changes)

**File**: `server/src/main/worker/Worker.ts`

**Changes**:
```typescript
// Worker.ts - NO MAJOR CHANGES
// Cron setup remains same
// Job execution remains same
// Only the job logic (SendLeadsJob) changes
```

---

### 6.2 SendLeadsJob.ts (Complete Rewrite)

**File**: `server/src/main/worker/jobs/SendLeadsJob.ts`

**Old Code**:
```typescript
async execute(): Promise<void> {
    const ready = await this.workerService.isTimeToSend();
    if (!ready) {
        console.log("SendLeadsJob: Not time yet");
        return;
    }

    const sent = await this.workerService.sendNextLead();
    console.log(`SendLeadsJob: Sent lead ${sent.id}`);
}
```

**New Code**:
```typescript
import { injectable } from "tsyringe";
import WorkerService from "../../services/workerService";

@injectable()
export default class SendLeadsJob {
    constructor(private readonly workerService: WorkerService) {}

    async execute(): Promise<void> {
        console.log("[SendLeadsJob] Starting buyer queue processing");

        try {
            await this.workerService.processAllBuyers();
            console.log("[SendLeadsJob] Completed successfully");
        } catch (error) {
            console.error("[SendLeadsJob] Error:", error);
            // Don't throw - allow job to complete
        }
    }
}
```

---

## 7. Worker Execution Flow (New)

### Detailed Flow

```
1. CRON TICK (e.g., every minute)
   ↓
2. Worker.checkAndRunJobs()
   ↓
3. Execute SendLeadsJob
   ↓
4. WorkerService.processAllBuyers()
   ↓
   4a. Get all buyers WHERE auto_send=true AND deleted_at IS NULL
       → Example: [Compass, Sellers, Pickle, Motivated, Andy, iSpeedToLead]
   ↓
   4b. FOR EACH buyer (in priority order):
       ↓
       BuyerDispatchService.processBuyerQueue(buyerId)
       ↓
       ┌─────────────────────────────────────────┐
       │ 5. Check buyer.next_send_at             │
       │    IF next_send_at > NOW():             │
       │      → Skip this buyer (not time yet)   │
       │    ELSE:                                │
       │      → Continue to step 6               │
       └─────────────────────────────────────────┘
       ↓
       ┌─────────────────────────────────────────┐
       │ 6. Get eligible leads for this buyer    │
       │    - Load leads not sent to buyer       │
       │    - Filter: verified (if required)     │
       │    - Filter: not expired                │
       │    - Filter: business hours             │
       │    - Filter: not blocked by higher      │
       │      priority buyer (allow_resell)      │
       │    - Use FOR UPDATE SKIP LOCKED         │
       └─────────────────────────────────────────┘
       ↓
       ┌─────────────────────────────────────────┐
       │ 7. IF eligible.length == 0:             │
       │      → Skip this buyer (no leads)       │
       │    ELSE:                                │
       │      → Continue to step 8               │
       └─────────────────────────────────────────┘
       ↓
       ┌─────────────────────────────────────────┐
       │ 8. Select one lead (random)             │
       │    const lead = eligible[random]        │
       └─────────────────────────────────────────┘
       ↓
       ┌─────────────────────────────────────────┐
       │ 9. Send to buyer                        │
       │    - Load lead_form_inputs              │
       │    - Build payload                      │
       │    - Call BuyerWebhookAdapter           │
       │    - Log to send_log                    │
       └─────────────────────────────────────────┘
       ↓
       ┌─────────────────────────────────────────┐
       │ 10. Schedule next send for this buyer   │
       │     - Random: min_minutes to max_minutes│
       │     - Update buyer.next_send_at,        │
       │       buyer.last_send_at, total_sends   │
       └─────────────────────────────────────────┘
   ↓
5. DONE (wait for next cron tick)
```

---

## 8. Example Worker Cycle

**Setup**:
- 3 buyers: Compass (priority 1), Sellers (priority 2), iSpeedToLead (priority 6)
- Compass: min=5, max=10 minutes
- Sellers: min=8, max=15 minutes
- iSpeedToLead: min=4, max=11 minutes
- 10 verified leads in system

**Cron tick at 12:00 PM**:

| Buyer | next_send_at | Ready? | Action | Next Scheduled |
|-------|--------------|--------|--------|----------------|
| Compass | 11:58 AM | ✅ Yes | Send lead #1 | 12:07 PM (random: 7 min) |
| Sellers | 12:05 PM | ❌ No | Skip | (unchanged) |
| iSpeedToLead | 11:55 AM | ✅ Yes | Send lead #2 | 12:09 PM (random: 9 min) |

**Cron tick at 12:01 PM**:

| Buyer | next_send_at | Ready? | Action |
|-------|--------------|--------|--------|
| Compass | 12:07 PM | ❌ No | Skip |
| Sellers | 12:05 PM | ❌ No | Skip |
| iSpeedToLead | 12:09 PM | ❌ No | Skip |

*No sends this cycle*

**Cron tick at 12:07 PM**:

| Buyer | next_send_at | Ready? | Action | Next Scheduled |
|-------|--------------|--------|--------|----------------|
| Compass | 12:07 PM | ✅ Yes | Send lead #3 | 12:15 PM (random: 8 min) |
| Sellers | 12:05 PM | ✅ Yes | Send lead #4 | 12:18 PM (random: 13 min) |
| iSpeedToLead | 12:09 PM | ❌ No | Skip | (unchanged) |

---

## 9. Concurrency & Locking

### Scenario: Multiple Workers (Future-Proofing)

**Problem**: If running multiple worker instances (horizontal scaling), two workers could process same buyer simultaneously.

**Solution**: PostgreSQL Advisory Locks

```typescript
// In BuyerDispatchService.processBuyerQueue()

async processBuyerQueue(buyerId: string): Promise<void> {
    // Generate numeric lock ID from buyerId
    const lockId = this.hashToInt(buyerId);

    // Try to acquire advisory lock
    const acquired = await this.db.oneOrNone<{ acquired: boolean }>(
        `SELECT pg_try_advisory_lock($1) AS acquired`,
        [lockId]
    );

    if (!acquired?.acquired) {
        console.log(`Buyer ${buyerId} is locked by another worker, skipping`);
        return;
    }

    try {
        // ... process buyer queue ...
    } finally {
        // Always release lock
        await this.db.none(`SELECT pg_advisory_unlock($1)`, [lockId]);
    }
}

private hashToInt(uuid: string): number {
    // Convert UUID to 32-bit integer for advisory lock
    const hash = uuid.split('-')[0];  // First segment
    return parseInt(hash, 16) & 0x7FFFFFFF;  // Convert to positive 31-bit int
}
```

**When to Use**: Only needed if running multiple worker processes. Single worker = no need.

---

## 10. Performance Considerations

### Query Optimization

**Problem**: `getEligibleLeadsForBuyer()` could be slow with many leads.

**Solutions**:

1. **Limit candidate set**:
   ```typescript
   // Only load last 24 hours of leads
   const candidateLeads = await this.leadDAO.getLeadsNotSentToBuyer(
       buyerId,
       { hoursBack: 24, limit: 500 }
   );
   ```

2. **Composite index**:
   ```sql
   CREATE INDEX idx_leads_buyer_eligibility
   ON leads(verified, sent, deleted_at, created)
   WHERE deleted_at IS NULL;
   ```

3. **Cache county timezones**:
   ```typescript
   // Load all counties once per job execution
   const counties = await this.countyService.getAll();
   const countyMap = new Map(counties.map(c => [c.id, c]));
   ```

---

## 11. Testing Checklist

### Unit Tests
- [ ] `scheduleBuyerNext()` generates random delay correctly
- [ ] `isBuyerReadyToSend()` compares timestamps correctly
- [ ] `getEligibleLeadsForBuyer()` filters correctly

### Integration Tests
- [ ] Single buyer sends at correct intervals
- [ ] Multiple buyers send independently
- [ ] Priority order respected (higher priority gets leads first)
- [ ] Business hours enforcement works
- [ ] `allow_resell=false` stops pipeline
- [ ] Row locking prevents duplicate sends

### Load Tests
- [ ] 100 leads, 6 buyers, measure throughput
- [ ] Check database CPU/memory under load
- [ ] Verify no deadlocks with concurrent sends
