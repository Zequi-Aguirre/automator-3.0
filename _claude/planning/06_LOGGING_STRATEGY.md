# Logging Strategy

## Decision: Reuse send_log Table

**Verdict**: ✅ **Reuse existing `send_log` table** with `buyer_id` column added

**Justification**:
- Already tracks all needed data: `lead_id`, `status`, `response_code`, `response_body`, `payout_cents`
- Historical continuity (old `investor_id` sends + new `buyer_id` sends coexist)
- No need for separate `buyer_sends` table
- Existing indexes/queries mostly work
- Single source of truth for all lead sends

---

## 1. Current send_log Schema

```sql
CREATE TABLE send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    investor_id UUID REFERENCES investors(id) ON DELETE SET NULL,  -- TO BE DEPRECATED
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,      -- TO BE DEPRECATED
    status VARCHAR(10) NOT NULL,  -- sent | failed
    response_code INTEGER,
    response_body TEXT,
    payout_cents INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

---

## 2. Enhanced send_log Schema (After Migration)

### Migration: Add buyer_id

```sql
-- Add buyer_id column (nullable for backward compatibility)
ALTER TABLE send_log
ADD COLUMN buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_send_log_buyer_id ON send_log(buyer_id);
CREATE INDEX idx_send_log_lead_buyer ON send_log(lead_id, buyer_id);
CREATE INDEX idx_send_log_buyer_created ON send_log(buyer_id, created_at DESC);

-- NO unique constraint on send_log (allow multiple attempts)
-- Sold status tracked separately in lead_buyer_outcomes table
```

### Final Schema (After Stage 6)

```sql
-- send_log: Append-only log of all send attempts
CREATE TABLE send_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL,  -- NEW
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

    status VARCHAR(10) NOT NULL,  -- sent | failed
    response_code INTEGER,
    response_body TEXT,
    payout_cents INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- lead_buyer_outcomes: Many-to-many sold status tracking
CREATE TABLE lead_buyer_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    sold BOOLEAN NOT NULL DEFAULT FALSE,  -- True = buyer accepted/purchased lead
    sold_at TIMESTAMP WITH TIME ZONE,  -- When buyer marked as sold
    send_log_id UUID REFERENCES send_log(id) ON DELETE SET NULL,  -- Link to successful send
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(lead_id, buyer_id, deleted_at)  -- One outcome per lead-buyer pair
);

CREATE INDEX idx_lead_buyer_outcomes_lead ON lead_buyer_outcomes(lead_id);
CREATE INDEX idx_lead_buyer_outcomes_buyer ON lead_buyer_outcomes(buyer_id);
CREATE INDEX idx_lead_buyer_outcomes_sold ON lead_buyer_outcomes(sold) WHERE sold = TRUE;
```

**Key Design Decisions**:
- `send_log` is **append-only** (NO unique constraints) - allows retry attempts
- `lead_buyer_outcomes` tracks **sold status** separately from send attempts
- A lead can be sold to multiple buyers (many-to-many relationship)
- `sold = TRUE` means buyer accepted the lead (tracked manually or via webhook callback)

**Removed columns** (Stage 6):
- `investor_id` (deprecated)
- `vendor_id` (merged into buyers)

---

## 3. SendLogDAO Updates

### New Methods

```typescript
// Get all send attempts for a lead, grouped by buyer
async getByLeadIdGroupedByBuyer(leadId: string): Promise<SendLog[]> {
    const query = `
        SELECT
            sl.*,
            b.name AS buyer_name,
            b.priority AS buyer_priority
        FROM send_log sl
        LEFT JOIN buyers b ON sl.buyer_id = b.id
        WHERE sl.lead_id = $1 AND sl.deleted_at IS NULL
        ORDER BY b.priority ASC NULLS LAST, sl.created_at DESC
    `;
    return await this.db.manyOrNone(query, [leadId]);
}

// Check if lead was sent successfully to a buyer (at least once)
async wasSuccessfullySentToBuyer(
    leadId: string,
    buyerId: string
): Promise<boolean> {
    const query = `
        SELECT EXISTS (
            SELECT 1 FROM send_log
            WHERE lead_id = $1
              AND buyer_id = $2
              AND status = 'sent'
              AND response_code >= 200
              AND response_code < 300
              AND deleted_at IS NULL
        ) AS exists
    `;
    const result = await this.db.one<{ exists: boolean }>(query, [leadId, buyerId]);
    return result.exists;
}

// Check if lead was SOLD to a buyer (from outcomes table)
async wasSoldToBuyer(
    leadId: string,
    buyerId: string
): Promise<boolean> {
    const query = `
        SELECT EXISTS (
            SELECT 1 FROM lead_buyer_outcomes
            WHERE lead_id = $1
              AND buyer_id = $2
              AND sold = TRUE
              AND deleted_at IS NULL
        ) AS exists
    `;
    const result = await this.db.one<{ exists: boolean }>(query, [leadId, buyerId]);
    return result.exists;
}

// Get buyers that have NOT been sent this lead yet
async getBuyersNotSentForLead(leadId: string): Promise<string[]> {
    const query = `
        SELECT b.id
        FROM buyers b
        WHERE b.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM send_log sl
              WHERE sl.lead_id = $1
                AND sl.buyer_id = b.id
                AND sl.deleted_at IS NULL
          )
        ORDER BY b.priority ASC
    `;
    const results = await this.db.manyOrNone<{ id: string }>(query, [leadId]);
    return results.map(r => r.id);
}

// Get latest send log for each buyer (for cooldown checks - if needed later)
async getLatestLogsByBuyerIds(buyerIds: string[]): Promise<SendLog[]> {
    const query = `
        SELECT DISTINCT ON (buyer_id)
            sl.*
        FROM send_log sl
        WHERE sl.buyer_id = ANY($1)
          AND sl.deleted_at IS NULL
        ORDER BY sl.buyer_id, sl.created_at DESC
    `;
    return await this.db.manyOrNone(query, [buyerIds]);
}

// Count successful sends per buyer (analytics)
async getSuccessCountByBuyer(
    startDate?: Date,
    endDate?: Date
): Promise<Array<{ buyer_id: string; buyer_name: string; count: number }>> {
    const query = `
        SELECT
            sl.buyer_id,
            b.name AS buyer_name,
            COUNT(*) AS count
        FROM send_log sl
        LEFT JOIN buyers b ON sl.buyer_id = b.id
        WHERE sl.status = 'sent'
          AND sl.response_code >= 200
          AND sl.response_code < 300
          AND sl.deleted_at IS NULL
          ${startDate ? 'AND sl.created_at >= $1' : ''}
          ${endDate ? 'AND sl.created_at <= $2' : ''}
        GROUP BY sl.buyer_id, b.name
        ORDER BY count DESC
    `;
    const params = [];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);

    return await this.db.manyOrNone(query, params);
}
```

---

## 4. Logging Successful Send with allow_resell Logic

**In BuyerDispatchService.sendLeadToBuyer()**:

```typescript
async sendLeadToBuyer(leadId: string, buyerId: string): Promise<SendLog> {
    const buyer = await this.buyerDAO.getById(buyerId);
    const lead = await this.leadDAO.getById(leadId);
    const form = await this.leadFormInputDAO.getByLeadId(leadId);

    // ... build payload, send to webhook ...

    const response = await this.buyerWebhookAdapter.sendToBuyer(
        buyer.webhook_url,
        payload,
        { auth_type: buyer.auth_type, auth_token: buyer.auth_token }
    );

    // Determine status
    const status = response.status >= 200 && response.status < 300 ? 'sent' : 'failed';

    // Log to send_log
    const sendLog = await this.sendLogDAO.create({
        lead_id: leadId,
        buyer_id: buyerId,
        affiliate_id: lead.affiliate_id || null,
        campaign_id: lead.campaign_id || null,
        status,
        response_code: response.status,
        response_body: JSON.stringify(response.data),
        payout_cents: response.data?.payout || null
    });

    // If successful, record outcome in lead_buyer_outcomes
    if (status === 'sent') {
        await this.leadBuyerOutcomeDAO.create({
            lead_id: leadId,
            buyer_id: buyerId,
            sold: false,  // Not sold yet (may be updated later)
            send_log_id: sendLog.id
        });

        if (!buyer.allow_resell) {
            console.log(
                `Lead ${leadId} sent to buyer ${buyer.name} (allow_resell=false). ` +
                `Lead will not be sent to lower-priority buyers.`
            );
        }
    }

    return sendLog;
}
```

**Recommendation**: Use **lead_buyer_outcomes** table for sold status tracking (many-to-many, allows multiple buyers to purchase same lead).

---

## 5. Querying Logs for allow_resell Logic

**In BuyerDispatchService.isLeadBlockedByHigherPriorityBuyer()**:

```typescript
async isLeadBlockedByHigherPriorityBuyer(
    leadId: string,
    currentPriority: number
): Promise<boolean> {
    // Query: check if any higher-priority buyer with allow_resell=false sold this lead
    const query = `
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
              AND sl.deleted_at IS NULL
              AND b.deleted_at IS NULL
        ) AS is_blocked
    `;

    const result = await this.db.one<{ is_blocked: boolean }>(
        query,
        [leadId, currentPriority]
    );

    return result.is_blocked;
}
```

**Performance**: This query runs for EVERY lead during filtering. Consider:
- Adding composite index: `CREATE INDEX idx_send_log_lead_buyer_priority ON send_log(lead_id, buyer_id) INCLUDE (status, response_code);`
- Caching results per worker cycle

**Note**: With append-only `send_log`, this query checks for ANY successful send, not just the first one.

---

## 6. Frontend Display: Buyer Send History

**API Endpoint**: `GET /api/leads/:id/buyers`

**Response**:
```json
{
  "lead_id": "uuid",
  "buyers": [
    {
      "buyer_id": "uuid",
      "buyer_name": "Compass",
      "buyer_priority": 1,
      "sends": [
        {
          "id": "uuid",
          "status": "sent",
          "response_code": 200,
          "response_body": "{\"success\": true, \"lead_id\": \"12345\"}",
          "payout_cents": 500,
          "created_at": "2026-02-27T10:30:00Z"
        }
      ]
    },
    {
      "buyer_id": "uuid",
      "buyer_name": "iSpeedToLead",
      "buyer_priority": 6,
      "sends": []  // Not sent yet
    }
  ]
}
```

**Service Method** (in `LeadService`):
```typescript
async getBuyerSendHistory(leadId: string): Promise<any> {
    const logs = await this.sendLogDAO.getByLeadIdGroupedByBuyer(leadId);
    const allBuyers = await this.buyerService.getByPriority();

    // Group logs by buyer
    const buyerMap = new Map<string, any>();

    for (const buyer of allBuyers) {
        buyerMap.set(buyer.id, {
            buyer_id: buyer.id,
            buyer_name: buyer.name,
            buyer_priority: buyer.priority,
            sends: []
        });
    }

    for (const log of logs) {
        if (log.buyer_id && buyerMap.has(log.buyer_id)) {
            buyerMap.get(log.buyer_id).sends.push({
                id: log.id,
                status: log.status,
                response_code: log.response_code,
                response_body: log.response_body,
                payout_cents: log.payout_cents,
                created_at: log.created_at
            });
        }
    }

    return {
        lead_id: leadId,
        buyers: Array.from(buyerMap.values())
    };
}
```

---

## 7. Preventing Duplicate Sends

### Application-Level Checks

**No unique constraint on send_log** (allows retries and multiple attempts)

**Pre-send Validation** (in `BuyerDispatchService.canSendToBuyer()`):
```typescript
async canSendToBuyer(lead: Lead, buyer: Buyer): Promise<boolean> {
    // Check if already sent successfully to this buyer
    const alreadySent = await this.sendLogDAO.wasSuccessfullySentToBuyer(
        lead.id,
        buyer.id
    );
    if (alreadySent) {
        console.log(`Lead ${lead.id} already sent to buyer ${buyer.name}`);
        return false;
    }

    // ... other checks ...
    return true;
}
```

**Benefits**:
- Allows retry attempts if first send fails
- Allows multiple failed attempts to be logged
- Still prevents sending same lead to same buyer multiple times (via application logic)

**Sold Status Tracking** (in `lead_buyer_outcomes` table):
```sql
-- One outcome record per lead-buyer pair
UNIQUE(lead_id, buyer_id, deleted_at)
```

This constraint prevents duplicate outcome records, while `send_log` remains append-only.

---

## 8. Analytics Queries

### Success Rate by Buyer

```sql
SELECT
    b.name,
    COUNT(*) FILTER (WHERE sl.status = 'sent' AND sl.response_code >= 200 AND sl.response_code < 300) AS successful,
    COUNT(*) FILTER (WHERE sl.status = 'failed' OR sl.response_code >= 400) AS failed,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE sl.status = 'sent' AND sl.response_code >= 200 AND sl.response_code < 300) /
        NULLIF(COUNT(*), 0),
        2
    ) AS success_rate
FROM send_log sl
JOIN buyers b ON sl.buyer_id = b.id
WHERE sl.created_at >= NOW() - INTERVAL '7 days'
  AND sl.deleted_at IS NULL
GROUP BY b.name
ORDER BY successful DESC;
```

---

### Pipeline Conversion Funnel

```sql
-- How many leads reached each buyer in priority order?
WITH lead_counts AS (
    SELECT
        b.priority,
        b.name,
        COUNT(DISTINCT sl.lead_id) AS leads_sent
    FROM send_log sl
    JOIN buyers b ON sl.buyer_id = b.id
    WHERE sl.status = 'sent'
      AND sl.response_code >= 200
      AND sl.response_code < 300
      AND sl.created_at >= NOW() - INTERVAL '30 days'
      AND sl.deleted_at IS NULL
    GROUP BY b.priority, b.name
)
SELECT
    priority,
    name,
    leads_sent,
    LAG(leads_sent) OVER (ORDER BY priority) AS leads_from_previous,
    CASE
        WHEN LAG(leads_sent) OVER (ORDER BY priority) IS NOT NULL
        THEN leads_sent - LAG(leads_sent) OVER (ORDER BY priority)
        ELSE leads_sent
    END AS unique_to_this_buyer
FROM lead_counts
ORDER BY priority;
```

---

## 9. Log Retention Policy

**Recommendation**: Keep logs for 90 days, then soft-delete

```sql
-- Weekly cron job
UPDATE send_log
SET deleted_at = NOW()
WHERE created_at < NOW() - INTERVAL '90 days'
  AND deleted_at IS NULL;
```

**Alternative**: Archive to separate table for long-term storage

---

## 10. Testing Checklist

### Unit Tests
- [ ] `getByLeadIdGroupedByBuyer()` returns buyers in priority order
- [ ] `wasSuccessfullySentToBuyer()` detects successful sends
- [ ] `getBuyersNotSentForLead()` excludes already-sent buyers

### Integration Tests
- [ ] Send to buyer, verify log created
- [ ] Send same lead to same buyer twice → unique constraint violation
- [ ] Send same lead to different buyers → allowed
- [ ] `isLeadBlockedByHigherPriorityBuyer()` works correctly
- [ ] Frontend displays send history correctly

### Performance Tests
- [ ] Query 1000 leads with send history (response time < 500ms)
- [ ] `isLeadBlockedByHigherPriorityBuyer()` with 100k send_log rows
