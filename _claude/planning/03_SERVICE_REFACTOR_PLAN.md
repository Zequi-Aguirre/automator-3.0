# Service Layer Refactor Plan

## 1. New Services

### 1.1 BuyerService.ts (Entity Service)

**Purpose**: CRUD operations for buyers

**File**: `server/src/main/services/buyerService.ts`

**Dependencies**:
- `BuyerDAO`

**Methods**:
```typescript
@injectable()
export default class BuyerService {
    constructor(private readonly buyerDAO: BuyerDAO) {}

    async getById(id: string): Promise<Buyer | null>

    async getAll(filters: BuyerFilters): Promise<{ items: Buyer[], count: number }>

    async create(data: BuyerCreateDTO): Promise<Buyer>

    async update(id: string, data: Partial<Buyer>): Promise<Buyer>

    async trash(id: string): Promise<Buyer>

    // Buyer-specific queries
    async getByPriority(): Promise<Buyer[]>
    // Returns buyers sorted by priority ASC (1 = highest)

    async getAutoSendBuyers(): Promise<Buyer[]>
    // Returns only buyers with auto_send=true AND deleted_at IS NULL
}
```

**Validation Rules**:
- `priority` must be unique (enforced by DB constraint)
- `webhook_url` must be valid URL format
- `min_minutes_between_sends` must be < `max_minutes_between_sends`
- `auth_type` must be one of: `bearer`, `api_key`, `none`

---

### 1.2 BuyerDispatchService.ts (Orchestrator Service)

**Purpose**: Orchestrate priority-based lead dispatch to buyers

**File**: `server/src/main/services/buyerDispatchService.ts`

**Dependencies**:
- `BuyerDAO`
- `LeadDAO`
- `LeadFormInputDAO`
- `SendLogDAO`
- `LeadBuyerOutcomeDAO`
- `WorkerSettingsDAO`
- `CountyService`
- `BuyerWebhookAdapter`
- `VendorReceiveDAO` (for non-production mocking)

**Core Methods**:

```typescript
@injectable()
export default class BuyerDispatchService {
    constructor(
        private readonly buyerDAO: BuyerDAO,
        private readonly leadDAO: LeadDAO,
        private readonly leadFormInputDAO: LeadFormInputDAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly leadBuyerOutcomeDAO: LeadBuyerOutcomeDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly countyService: CountyService,
        private readonly buyerWebhookAdapter: BuyerWebhookAdapter,
        private readonly vendorReceiveDAO: VendorReceiveDAO
    ) {}

    // ===== CORE DISPATCH =====

    async sendLeadToBuyer(leadId: string, buyerId: string): Promise<SendLog> {
        // 1. Load lead, buyer, form data
        // 2. Validate: canSendToBuyer()
        // 3. Build payload (merge lead + form)
        // 4. Call buyerWebhookAdapter (or mock in non-prod)
        // 5. Log result to send_log
        // 6. Return SendLog
    }

    // ===== VALIDATION =====

    async canSendToBuyer(lead: Lead, buyer: Buyer): Promise<boolean> {
        // Check 1: Buyer requires_validation, but lead not verified
        if (buyer.requires_validation && !lead.verified) return false;

        // Check 2: Already sent successfully to this buyer
        const alreadySent = await this.sendLogDAO.wasSuccessfullySentToBuyer(
            lead.id,
            buyer.id
        );
        if (alreadySent) return false;

        // Check 3: Lead expired
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const expireHours = settings.expire_after_hours || 18;
        const leadAge = Date.now() - new Date(lead.created).getTime();
        if (leadAge > expireHours * 60 * 60 * 1000) return false;

        // Check 4: Global business hours (county timezone)
        const county = await this.countyService.getById(lead.county_id);
        if (!county) return false;

        const localMinute = this.getCountyLocalMinute(county.timezone);
        if (localMinute < settings.business_hours_start ||
            localMinute >= settings.business_hours_end) {
            return false;
        }

        return true;
    }

    // ===== WORKER AUTOMATION =====

    async processBuyerQueue(buyerId: string): Promise<void> {
        // 1. Check if buyer is ready to send (buyer.next_send_at <= NOW)
        const ready = await this.isBuyerReadyToSend(buyerId);
        if (!ready) {
            console.log(`Buyer ${buyerId} not ready to send yet`);
            return;
        }

        // 2. Get eligible leads for this buyer
        const leads = await this.getEligibleLeadsForBuyer(buyerId);
        if (leads.length === 0) {
            console.log(`No eligible leads for buyer ${buyerId}`);
            return;
        }

        // 3. Select one lead (random or priority-based)
        const lead = leads[Math.floor(Math.random() * leads.length)];

        // 4. Send to buyer
        await this.sendLeadToBuyer(lead.id, buyerId);

        // 5. Schedule next send for this buyer
        await this.scheduleBuyerNext(buyerId);
    }

    async getEligibleLeadsForBuyer(buyerId: string): Promise<Lead[]> {
        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) return [];

        // Get all leads not yet sent to this buyer
        const candidateLeads = await this.leadDAO.getLeadsNotSentToBuyer(buyerId);

        // Filter by:
        // - buyer.requires_validation (if true, only verified leads)
        // - Not expired
        // - Business hours (global)
        // - Not sold to higher-priority buyer with allow_resell=false

        const eligible: Lead[] = [];
        for (const lead of candidateLeads) {
            const canSend = await this.canSendToBuyer(lead, buyer);
            if (!canSend) continue;

            // Check allow_resell logic
            const isBlocked = await this.isLeadBlockedByHigherPriorityBuyer(
                lead.id,
                buyer.priority
            );
            if (isBlocked) continue;

            eligible.push(lead);
        }

        return eligible;
    }

    async isLeadBlockedByHigherPriorityBuyer(
        leadId: string,
        currentPriority: number
    ): Promise<boolean> {
        // Get all buyers with higher priority (lower number)
        const higherPriorityBuyers = await this.buyerDAO.getByPriorityLessThan(
            currentPriority
        );

        for (const higherBuyer of higherPriorityBuyers) {
            if (!higherBuyer.allow_resell) {
                // Check if lead was successfully sent to this buyer
                const wasSold = await this.sendLogDAO.wasSuccessfullySentToBuyer(
                    leadId,
                    higherBuyer.id
                );
                if (wasSold) {
                    return true;  // Blocked
                }
            }
        }

        return false;  // Not blocked
    }

    // ===== SCHEDULING =====

    async scheduleBuyerNext(buyerId: string): Promise<void> {
        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) throw new Error("Buyer not found");

        const { min_minutes_between_sends, max_minutes_between_sends } = buyer;

        // Generate random integer between min and max (inclusive)
        const randomMinutes = Math.floor(
            Math.random() * (max_minutes_between_sends - min_minutes_between_sends + 1)
        ) + min_minutes_between_sends;

        const nextSendAt = new Date();
        nextSendAt.setMinutes(nextSendAt.getMinutes() + randomMinutes);

        // Update timing directly on buyers table
        await this.buyerDAO.updateTiming(buyerId, {
            next_send_at: nextSendAt,
            last_send_at: new Date(),
            total_sends: buyer.total_sends + 1
        });

        console.log(
            `Buyer ${buyer.name}: next send in ${randomMinutes} min (${nextSendAt})`
        );
    }

    async isBuyerReadyToSend(buyerId: string): Promise<boolean> {
        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer || !buyer.next_send_at) return true;

        return new Date(buyer.next_send_at) <= new Date();
    }

    // ===== UTILITIES =====

    private getCountyLocalMinute(timezone: string): number {
        const now = new Date();
        const localTime = new Date(
            now.toLocaleString("en-US", { timeZone: timezone })
        );
        return localTime.getHours() * 60 + localTime.getMinutes();
    }
}
```

---

## 2. Refactored Services

### 2.1 LeadService.ts (Major Changes)

**Changes**:
1. Remove `investor_id` handling in `importLeadsFromCSV()`
2. Remove `investor_id` handling in `importLeadsFromApi()`
3. Add `sendLeadToBuyer()` method
4. Add `getBuyerSendHistory()` method

**New Methods**:

```typescript
@injectable()
export default class LeadService {
    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadFormInputDAO: LeadFormInputDAO,
        private readonly countyService: CountyService,
        // Remove: private readonly investorService: InvestorService,
        private readonly buyerDispatchService: BuyerDispatchService,  // NEW
        private readonly sendLogDAO: SendLogDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO
    ) {}

    // ===== NEW METHODS =====

    async sendLeadToBuyer(leadId: string, buyerId: string): Promise<SendLog> {
        // Delegate to BuyerDispatchService
        return await this.buyerDispatchService.sendLeadToBuyer(leadId, buyerId);
    }

    async getBuyerSendHistory(leadId: string): Promise<SendLog[]> {
        return await this.sendLogDAO.getByLeadIdGroupedByBuyer(leadId);
    }

    // ===== MODIFIED METHODS =====

    async importLeadsFromCSV(leads: parsedLeadFromCSV[]): Promise<ImportResult> {
        // OLD: Look up investor_id from lead.investor_id or lead.investor_name
        // NEW: No investor lookup, just county lookup

        for (const lead of leads) {
            // County lookup (unchanged)
            const county = await this.countyService.getByNameAndState(
                lead.county,
                lead.state
            );

            // Insert lead WITHOUT investor_id
            await this.leadDAO.create({
                ...lead,
                county_id: county.id
                // investor_id removed
            });
        }
    }

    async importLeadsFromApi(payloads: ApiLeadPayload[]): Promise<ImportResult> {
        // Same as importLeadsFromCSV: remove investor_id handling
    }

    // ===== UNCHANGED METHODS =====

    async getLeadById(leadId: string): Promise<Lead | null>
    async updateLead(leadId: string, leadData: Partial<Lead>): Promise<Lead>
    async verifyLead(leadId: string): Promise<Lead>
    async trashLead(leadId: string, reason: string): Promise<Lead>
}
```

---

### 2.2 WorkerService.ts (Complete Rewrite)

**Old Paradigm**: Pick one lead globally, send to iSpeedToLead, schedule next global send

**New Paradigm**: Process each buyer's queue independently

**Changes**:

```typescript
@injectable()
export default class WorkerService {
    constructor(
        private readonly buyerDispatchService: BuyerDispatchService,  // NEW
        private readonly buyerService: BuyerService,  // NEW
        private readonly leadDAO: LeadDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO
    ) {}

    // ===== NEW MAIN METHOD =====

    async processAllBuyers(): Promise<void> {
        const buyers = await this.buyerService.getAutoSendBuyers();

        console.log(`Processing ${buyers.length} auto-send buyers`);

        for (const buyer of buyers) {
            try {
                console.log(`Processing buyer: ${buyer.name} (priority ${buyer.priority})`);
                await this.buyerDispatchService.processBuyerQueue(buyer.id);
            } catch (error) {
                console.error(
                    `Error processing buyer ${buyer.name}:`,
                    error instanceof Error ? error.message : error
                );
                // Continue to next buyer (don't fail entire job)
            }
        }
    }

    // ===== UNCHANGED METHOD =====

    async trashExpiredLeads(): Promise<number> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const expireHours = Number(settings.expire_after_hours) || 18;
        const reason = `EXPIRED_${expireHours}_HOURS`;
        return await this.leadDAO.trashExpiredLeads(expireHours, reason);
    }

    // ===== REMOVED METHODS =====

    // ❌ applyFilters() - investor/county/state cooldown logic deleted
    // ❌ pickLeadForWorker() - replaced by BuyerDispatchService.getEligibleLeadsForBuyer()
    // ❌ sendNextLead() - replaced by processAllBuyers()
    // ❌ scheduleNext() - replaced by BuyerDispatchService.scheduleBuyerNext()
    // ❌ isTimeToSend() - replaced by per-buyer ready checks
}
```

---

## 3. Service Call Flows

### 3.1 Manual Send (Frontend → API)

```
User clicks "Send to Buyer X" button
  ↓
POST /api/leads/:leadId/send-to-buyer
Body: { buyer_id: "uuid" }
  ↓
LeadResource.sendToBuyer(req, res)
  ↓
LeadService.sendLeadToBuyer(leadId, buyerId)
  ↓
BuyerDispatchService.sendLeadToBuyer(leadId, buyerId)
  ↓
  1. Load lead, buyer, form_inputs
  2. canSendToBuyer() validation
  3. Build payload (merge lead + form)
  4. BuyerWebhookAdapter.sendToBuyer(url, payload, auth)
  5. Log to send_log (buyer_id, status, response)
  ↓
Return SendLog to frontend
```

---

### 3.2 Automated Send (Worker)

```
Cron tick (e.g., every minute)
  ↓
Worker.checkAndRunJobs()
  ↓
SendLeadsJob.execute()
  ↓
WorkerService.processAllBuyers()
  ↓
For each buyer in buyerService.getAutoSendBuyers():
  ↓
  BuyerDispatchService.processBuyerQueue(buyerId)
    ↓
    1. isBuyerReadyToSend(buyerId)
       - Check buyer.next_send_at <= NOW()
       - If not ready, skip buyer
    ↓
    2. getEligibleLeadsForBuyer(buyerId)
       - Load leads not sent to this buyer
       - Filter: verified (if required), not expired, business hours
       - Filter: not blocked by higher-priority buyer (allow_resell check)
    ↓
    3. Select one lead (random)
    ↓
    4. sendLeadToBuyer(leadId, buyerId)
       - Same flow as manual send
    ↓
    5. scheduleBuyerNext(buyerId)
       - Random delay: NOW() + random(min_minutes, max_minutes)
       - Update buyer.next_send_at, buyer.last_send_at, buyer.total_sends
```

---

## 4. Service Dependencies Graph

```
WorkerService
  └── BuyerDispatchService
        ├── BuyerDAO
        ├── LeadDAO
        ├── LeadFormInputDAO
        ├── SendLogDAO
        ├── LeadBuyerOutcomeDAO
        ├── WorkerSettingsDAO
        ├── CountyService
        │     └── CountyDAO
        ├── BuyerWebhookAdapter
        └── VendorReceiveDAO

LeadService
  └── BuyerDispatchService (for sendLeadToBuyer)
  └── CountyService
  └── SendLogDAO

BuyerService
  └── BuyerDAO
```

---

## 5. Validation & Error Handling

### Service-Level Validations

**BuyerService.create()**:
- ✅ Priority must be unique (DB enforces, but catch error)
- ✅ `webhook_url` must be valid URL
- ✅ `min_minutes` < `max_minutes`
- ✅ `auth_type` in allowed values

**BuyerDispatchService.sendLeadToBuyer()**:
- ✅ Lead exists
- ✅ Buyer exists
- ✅ Lead verified (if buyer.requires_validation)
- ✅ Form inputs exist
- ✅ County exists
- ✅ Not already sent successfully to this buyer

### Error Responses

**Service Methods Should Throw**:
- `new Error("Lead not found")` → Resource catches, returns 404
- `new Error("Buyer not found")` → Resource catches, returns 404
- `new Error("Lead must be verified first")` → Resource catches, returns 400
- `new Error("Already sent to this buyer")` → Resource catches, returns 409

**Worker Error Handling**:
- Per-buyer errors logged, but don't stop processing other buyers
- Failed webhook calls logged to `send_log` with `status='failed'`

---

## 6. Testing Strategy

### Unit Tests (To Add)

**BuyerDispatchService**:
- `canSendToBuyer()` - all validation branches
- `isLeadBlockedByHigherPriorityBuyer()` - allow_resell logic
- `scheduleBuyerNext()` - random delay calculation

**WorkerService**:
- `processAllBuyers()` - error isolation (one buyer fails, others continue)

### Integration Tests

**Manual Send Flow**:
1. Create buyer
2. Import lead
3. Verify lead
4. Call `LeadService.sendLeadToBuyer()`
5. Verify `send_log` entry created
6. Verify buyer timing NOT updated (manual sends don't affect schedule)

**Automated Send Flow**:
1. Create 2 buyers (different priorities)
2. Import 5 leads, verify all
3. Enable worker
4. Wait for worker cron tick
5. Verify leads sent in priority order
6. Verify buyer timing updated for both buyers (next_send_at, last_send_at, total_sends)
