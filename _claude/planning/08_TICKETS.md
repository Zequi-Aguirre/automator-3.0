# All Tickets (38 Total)

> **Note**: This document contains all 38 implementation tickets organized by sprint. Each ticket includes acceptance criteria, files affected, and testing requirements. See `09_IMPLEMENTATION_ORDER.md` for sprint breakdown and deployment strategies.

---

## Sprint 1: Foundation & Admin UI (Tickets #1-10)

### TICKET-001: Create buyers table migration with timing columns
**Type**: Database
**Priority**: P0
**Estimate**: 3 hours

**Tasks**:
- Create migration file: `postgres/migrations/YYYYMMDD_01_create_buyers_and_outcomes.sql`
- Add `buyers` table with all columns:
  - Basic: name, webhook_url, dispatch_mode, priority, auto_send, allow_resell, requires_validation
  - Timing: min/max_minutes_between_sends, next_send_at, last_send_at, total_sends
  - Auth: auth_header_name, auth_header_prefix, auth_token_encrypted
  - Audit: created_at, modified_at, deleted_at
- Add `lead_buyer_outcomes` table for many-to-many sold status
- Create indexes on priority, auto_send, dispatch_mode, next_send_at, deleted_at
- Add UNIQUE constraint on priority
- Add unique constraint on lead_buyer_outcomes(lead_id, buyer_id)

**Acceptance Criteria**:
- [ ] Migration runs without errors
- [ ] buyers table visible in database with timing columns
- [ ] lead_buyer_outcomes table created
- [ ] All indexes created
- [ ] Priority uniqueness enforced
- [ ] Outcome uniqueness enforced

**Files**: `postgres/migrations/YYYYMMDD_01_create_buyers_and_outcomes.sql`

---

### TICKET-002: Extend send_log and leads tables
**Type**: Database
**Priority**: P0
**Estimate**: 2 hours

**Tasks**:
- Create migration: `postgres/migrations/YYYYMMDD_02_extend_send_log_and_leads.sql`
- Add buyer_id column to send_log (nullable, FK to buyers)
- Add worker_enabled column to leads (boolean, default false)
- Create indexes: buyer_id, (lead_id, buyer_id), (buyer_id, created_at)
- Create index on leads(worker_enabled)
- **DO NOT** add unique constraint to send_log (append-only design)

**Acceptance Criteria**:
- [ ] buyer_id column added to send_log
- [ ] worker_enabled column added to leads
- [ ] FK constraints work
- [ ] All indexes created
- [ ] No unique constraint on send_log (allows retry attempts)

**Files**: `postgres/migrations/YYYYMMDD_02_extend_send_log_and_leads.sql`

---

### TICKET-003: Create BuyerDAO with encryption utilities
**Type**: Backend (Data Layer)
**Priority**: P0
**Estimate**: 5 hours

**Tasks**:
- Create `server/src/main/data/buyerDAO.ts`
- Implement CRUD methods: getById, getAll, create, update, updateTiming, trash
- Implement buyer-specific queries: getByPriority, getAutoSendBuyers, getByPriorityLessThan, getWorkerBuyers
- Implement application-level encryption/decryption for auth_token_encrypted
- Implement soft-delete filtering

**Acceptance Criteria**:
- [ ] All CRUD methods work
- [ ] auth_token_encrypted correctly encrypted/decrypted using Node crypto
- [ ] getByPriority returns sorted by priority ASC
- [ ] getAutoSendBuyers filters auto_send=true
- [ ] getWorkerBuyers filters dispatch_mode IN ('worker','both')
- [ ] updateTiming() updates next_send_at, last_send_at, total_sends
- [ ] Soft-delete filtering on all queries

**Files**: `server/src/main/data/buyerDAO.ts`

---

### TICKET-004: Create LeadBuyerOutcomeDAO
**Type**: Backend (Data Layer)
**Priority**: P0
**Estimate**: 2 hours

**Tasks**:
- Create `server/src/main/data/leadBuyerOutcomeDAO.ts`
- Implement: create, getByLeadId, getByLeadAndBuyer, update, trash
- Add method to check if sold to buyer

**Acceptance Criteria**:
- [ ] All methods implemented
- [ ] create() enforces unique constraint on (lead_id, buyer_id)
- [ ] getByLeadId returns all outcomes for lead
- [ ] wasSoldToBuyer() returns boolean

**Files**: `server/src/main/data/leadBuyerOutcomeDAO.ts`

---

### TICKET-005: Create buyerTypes.ts and leadBuyerOutcomeTypes.ts
**Type**: Backend (Types)
**Priority**: P0
**Estimate**: 1.5 hours

**Tasks**:
- Create `server/src/main/types/buyerTypes.ts`
- Define types: Buyer, BuyerCreateDTO, BuyerUpdateDTO, BuyerFilters, BuyerAuthConfig
- Create `server/src/main/types/leadBuyerOutcomeTypes.ts`
- Define types: LeadBuyerOutcome, OutcomeCreateDTO

**Acceptance Criteria**:
- [ ] All types defined
- [ ] Matches database schema
- [ ] Used in BuyerDAO and LeadBuyerOutcomeDAO

**Files**: `server/src/main/types/buyerTypes.ts`, `server/src/main/types/leadBuyerOutcomeTypes.ts`

---

### TICKET-006: Update sendLogTypes.ts and leadTypes.ts
**Type**: Backend (Types)
**Priority**: P0
**Estimate**: 30 minutes

**Tasks**:
- Update `server/src/main/types/sendLogTypes.ts`
- Add buyer_id, buyer_name fields to SendLog type
- Update `server/src/main/types/leadTypes.ts`
- Add worker_enabled field to Lead type

**Acceptance Criteria**:
- [ ] buyer_id field added to SendLog
- [ ] buyer_name field added (for joined queries)
- [ ] worker_enabled field added to Lead

**Files**: `server/src/main/types/sendLogTypes.ts`, `server/src/main/types/leadTypes.ts`

---

### TICKET-007: Create BuyerService
**Type**: Backend (Service Layer)
**Priority**: P0
**Estimate**: 3 hours

**Tasks**:
- Create `server/src/main/services/buyerService.ts`
- Implement CRUD methods delegating to BuyerDAO
- Implement getByPriority, getAutoSendBuyers, getWorkerBuyers
- Add validation: priority unique, min < max minutes, valid URL

**Acceptance Criteria**:
- [ ] All methods work
- [ ] Validation throws errors for invalid input
- [ ] Uses tsyringe DI

**Files**: `server/src/main/services/buyerService.ts`

---

### TICKET-008: Create BuyerResource (API)
**Type**: Backend (Resource Layer)
**Priority**: P0
**Estimate**: 4 hours

**Tasks**:
- Create `server/src/main/resources/buyerResource.ts`
- Implement routes: GET /api/buyers, POST /api/buyers, PUT /api/buyers/:id, DELETE /api/buyers/:id
- Add admin-only authentication
- Mask auth_token_encrypted in responses
- Register routes in AutomatorServer.ts

**Acceptance Criteria**:
- [ ] All CRUD endpoints work
- [ ] Only admins can access
- [ ] Returns proper HTTP status codes
- [ ] Errors handled gracefully
- [ ] auth_token_encrypted masked in GET responses

**Files**: `server/src/main/resources/buyerResource.ts`, `server/src/main/AutomatorServer.ts`

---

### TICKET-009: Create frontend buyerService.ts
**Type**: Frontend (Service)
**Priority**: P0
**Estimate**: 2 hours

**Tasks**:
- Create `client/src/services/buyerService.ts`
- Implement API client methods: getAll, create, update, delete
- Use axios with JWT auth headers

**Acceptance Criteria**:
- [ ] All methods work
- [ ] Errors handled
- [ ] Types match backend

**Files**: `client/src/services/buyerService.ts`

---

### TICKET-010: Create admin buyers CRUD UI
**Type**: Frontend (Components)
**Priority**: P0
**Estimate**: 8 hours

**Tasks**:
- Create `client/src/components/admin/adminBuyersSection/`
- Create buyers table (MUI DataGrid) with columns: name, priority, webhook_url, dispatch_mode, auto_send, actions
- Create create/edit modal with form fields (including custom auth headers)
- Implement delete confirmation
- Add to admin routes
- Mask auth_token_encrypted in UI (show "***" if set)

**Acceptance Criteria**:
- [ ] Buyers table displays all buyers
- [ ] Create buyer works
- [ ] Edit buyer works
- [ ] Delete buyer works (soft delete)
- [ ] Form validation works
- [ ] auth_token_encrypted masked in display
- [ ] Can configure custom auth header name and prefix

**Files**: `client/src/components/admin/adminBuyersSection/`, `client/src/views/adminViews/AdminBuyersView.tsx`, `client/src/context/routes/AdminRoutes.tsx`

---

## Sprint 2: Dispatch Logic & Manual Sends (Tickets #11-18)

### TICKET-011: Create BuyerWebhookAdapter with flexible auth
**Type**: Backend (Adapter Layer)
**Priority**: P0
**Estimate**: 4 hours

**Tasks**:
- Create `server/src/main/adapters/buyerWebhookAdapter.ts`
- Implement sendToBuyer(url, payload, authConfig)
- Support flexible headers via auth_header_name, auth_header_prefix, auth_token_encrypted
- 15-second timeout
- Strip null/undefined values from payload

**Acceptance Criteria**:
- [ ] Custom header name works (e.g., X-Custom-Auth)
- [ ] Header prefix works (e.g., "Bearer ", "ApiKey ")
- [ ] No prefix works (just token value)
- [ ] Timeout enforced
- [ ] Errors preserved for logging

**Files**: `server/src/main/adapters/buyerWebhookAdapter.ts`

---

### TICKET-012: Extend SendLogDAO for buyer queries
**Type**: Backend (Data Layer)
**Priority**: P0
**Estimate**: 2 hours

**Tasks**:
- Update `server/src/main/data/sendLogDAO.ts`
- Add getByLeadIdGroupedByBuyer(leadId)
- Add wasSuccessfullySentToBuyer(leadId, buyerId)
- Add getBuyersNotSentForLead(leadId)
- Add getLatestLogsByBuyerIds(buyerIds[])

**Acceptance Criteria**:
- [ ] All methods implemented
- [ ] getByLeadIdGroupedByBuyer joins buyers table, sorts by priority
- [ ] wasSuccessfullySentToBuyer checks 200-299 status codes
- [ ] Query performance acceptable

**Files**: `server/src/main/data/sendLogDAO.ts`

---

### TICKET-013: Create BuyerDispatchService
**Type**: Backend (Service Layer)
**Priority**: P0
**Estimate**: 8 hours

**Tasks**:
- Create `server/src/main/services/buyerDispatchService.ts`
- Implement sendLeadToBuyer(leadId, buyerId)
- Implement canSendToBuyer(lead, buyer) validation
- Implement scheduleBuyerNext(buyerId) with random delay (updates buyer.next_send_at)
- Implement isLeadBlockedByHigherPriorityBuyer() using lead_buyer_outcomes
- Integrate BuyerWebhookAdapter
- Environment-aware routing (mock in non-prod)
- Log to send_log

**Acceptance Criteria**:
- [ ] sendLeadToBuyer works end-to-end
- [ ] canSendToBuyer validates all rules
- [ ] scheduleBuyerNext generates random delay and updates buyer.next_send_at
- [ ] Non-production routes to vendor_receives table
- [ ] Production calls real webhook
- [ ] send_log entry created (allows retries)
- [ ] allow_resell logic checks lead_buyer_outcomes, not send_log

**Files**: `server/src/main/services/buyerDispatchService.ts`

---

### TICKET-014: Add manual send to buyer API endpoint
**Type**: Backend (Resource Layer)
**Priority**: P0
**Estimate**: 2 hours

**Tasks**:
- Update `server/src/main/resources/leadResource.ts`
- Add POST /api/leads/:id/send-to-buyer endpoint
- Body: { buyer_id: string }
- Call leadService.sendLeadToBuyer()

**Acceptance Criteria**:
- [ ] Endpoint works
- [ ] Returns send_log result
- [ ] Errors handled (404 lead not found, 404 buyer not found, 400 validation)

**Files**: `server/src/main/resources/leadResource.ts`

---

### TICKET-015: Add buyer history and worker control to LeadService
**Type**: Backend (Service Layer)
**Priority**: P0
**Estimate**: 3 hours

**Tasks**:
- Update `server/src/main/services/leadService.ts`
- Add sendLeadToBuyer(leadId, buyerId) method (delegates to BuyerDispatchService)
- Add getBuyerSendHistory(leadId) method
- Add enableWorker(leadId) method (sets worker_enabled=true)
- Add markSoldToBuyer(leadId, buyerId, soldPrice?) method (creates outcome record)

**Acceptance Criteria**:
- [ ] sendLeadToBuyer works
- [ ] getBuyerSendHistory returns all buyers with send status
- [ ] enableWorker sets worker_enabled=true
- [ ] markSoldToBuyer creates lead_buyer_outcome record

**Files**: `server/src/main/services/leadService.ts`

---

### TICKET-016: Add buyer history and worker control API endpoints
**Type**: Backend (Resource Layer)
**Priority**: P0
**Estimate**: 2 hours

**Tasks**:
- Update `server/src/main/resources/leadResource.ts`
- Add GET /api/leads/:id/buyers endpoint (returns buyer send history)
- Add POST /api/leads/:id/enable-worker endpoint (sets worker_enabled=true)
- Add POST /api/leads/:id/buyers/:buyerId/sold endpoint (marks sold)

**Acceptance Criteria**:
- [ ] GET /api/leads/:id/buyers returns JSON with buyers array
- [ ] POST /api/leads/:id/enable-worker sets worker_enabled=true
- [ ] POST /api/leads/:id/buyers/:buyerId/sold creates outcome record
- [ ] Includes buyers not sent yet (empty sends array)

**Files**: `server/src/main/resources/leadResource.ts`

---

### TICKET-017: Create buyer send modal UI with sold toggles
**Type**: Frontend (Components)
**Priority**: P1
**Estimate**: 8 hours

**Tasks**:
- Create `client/src/components/common/leadDetails/buyerSendModal/`
- Show two sections:
  - **Manual Buyers** (Compass, Sellers, Pickle): "Send" button, "Sold" toggle, attempt history
  - **Worker Buyers** (Motivated, Andy, iSpeedToLead): Disabled until worker_enabled=true
- Show "Send to Worker" button at bottom (enables worker processing)
- Disable send if: already sent, requires_validation but not verified
- Refresh after manual send

**Acceptance Criteria**:
- [ ] Modal displays manual and worker buyers separately
- [ ] Send button works for manual buyers
- [ ] Sold toggle creates outcome record
- [ ] "Send to Worker" button sets worker_enabled=true
- [ ] Status updates after send
- [ ] Validation rules enforced
- [ ] Response details visible
- [ ] Allow retry attempts (multiple sends to same buyer)

**Files**: `client/src/components/common/leadDetails/buyerSendModal/`

---

### TICKET-018: Add buyers column to leads table and worker button
**Type**: Frontend (Components)
**Priority**: P1
**Estimate**: 3 hours

**Tasks**:
- Update `client/src/components/common/leadsSection/leadsTable/LeadsTable.tsx`
- Add "Buyers" column with icon + badge (shows send count)
- Add "Worker" column with icon (shows if worker_enabled=true)
- Click Buyers opens BuyerSendModal

**Acceptance Criteria**:
- [ ] Buyers column visible in leads table
- [ ] Badge shows correct send count
- [ ] Worker column shows enabled status
- [ ] Modal opens on click

**Files**: `client/src/components/common/leadsSection/leadsTable/LeadsTable.tsx`

---

## Sprint 3: iSpeedToLead Migration (Tickets #19-20)

### TICKET-019: Migration - Add iSpeedToLead as buyer
**Type**: Database
**Priority**: P0 (CRITICAL)
**Estimate**: 3 hours

**Tasks**:
- Create migration: `postgres/migrations/YYYYMMDD_03_add_ispeedtolead_buyer.sql`
- Insert iSpeedToLead buyer (priority 6, dispatch_mode='worker', auto_send=true, requires_validation=true)
- Use LEAD_VENDOR_URL from env
- Set next_send_at to NOW() (immediately eligible)
- Backfill send_log.buyer_id from investor_id mappings

**Acceptance Criteria**:
- [ ] iSpeedToLead buyer created with dispatch_mode='worker'
- [ ] next_send_at initialized
- [ ] send_log.buyer_id backfilled
- [ ] Migration idempotent

**Files**: `postgres/migrations/YYYYMMDD_03_add_ispeedtolead_buyer.sql`

---

### TICKET-020: Verify iSpeedToLead buyer in UI
**Type**: Testing
**Priority**: P0
**Estimate**: 1 hour

**Tasks**:
- Check buyers table shows iSpeedToLead with dispatch_mode='worker'
- Manual send test lead to iSpeedToLead (should fail - worker buyer only)
- Verify webhook called
- Verify response logged

**Acceptance Criteria**:
- [ ] iSpeedToLead visible in admin UI with dispatch_mode='worker'
- [ ] Manual send blocked (worker buyer only)
- [ ] Webhook URL correct
- [ ] Response logged to send_log

**Files**: N/A (Testing only)

---

## Sprint 4: Worker Switchover (Tickets #21-25) ⚠️ HIGH RISK

### TICKET-021: Refactor WorkerService to use buyers with worker gating
**Type**: Backend (Service Layer)
**Priority**: P0 (CRITICAL)
**Estimate**: 8 hours

**Tasks**:
- Update `server/src/main/services/workerService.ts`
- Replace sendNextLead() with processAllBuyers()
- Filter buyers by dispatch_mode IN ('worker','both')
- Filter leads by worker_enabled=true
- Remove applyFilters(), pickLeadForWorker(), scheduleNext()
- Keep trashExpiredLeads() unchanged

**Acceptance Criteria**:
- [ ] processAllBuyers() implemented
- [ ] Only processes worker buyers (dispatch_mode IN ('worker','both'))
- [ ] Only processes leads where worker_enabled=true
- [ ] Old methods removed
- [ ] trashExpiredLeads() still works
- [ ] Uses BuyerDispatchService

**Files**: `server/src/main/services/workerService.ts`

---

### TICKET-022: Add per-buyer queue processing to BuyerDispatchService
**Type**: Backend (Service Layer)
**Priority**: P0 (CRITICAL)
**Estimate**: 8 hours

**Tasks**:
- Update `server/src/main/services/buyerDispatchService.ts`
- Implement processBuyerQueue(buyerId)
- Implement getEligibleLeadsForBuyer(buyerId) - filters by worker_enabled=true
- Implement isLeadBlockedByHigherPriorityBuyer(leadId, priority) - checks lead_buyer_outcomes
- Implement isBuyerReadyToSend(buyerId) - checks buyer.next_send_at
- Add row-level locking (FOR UPDATE SKIP LOCKED)

**Acceptance Criteria**:
- [ ] processBuyerQueue works for single buyer
- [ ] getEligibleLeadsForBuyer filters worker_enabled=true leads correctly
- [ ] allow_resell logic checks lead_buyer_outcomes table
- [ ] Row locking prevents duplicates
- [ ] Business hours enforced
- [ ] isBuyerReadyToSend checks buyer.next_send_at column

**Files**: `server/src/main/services/buyerDispatchService.ts`, `server/src/main/data/leadDAO.ts`

---

### TICKET-023: Update SendLeadsJob to call processAllBuyers
**Type**: Backend (Worker)
**Priority**: P0 (CRITICAL)
**Estimate**: 2 hours

**Tasks**:
- Update `server/src/main/worker/jobs/SendLeadsJob.ts`
- Change from workerService.sendNextLead() to workerService.processAllBuyers()
- Add per-buyer error handling

**Acceptance Criteria**:
- [ ] Job calls processAllBuyers
- [ ] Errors in one buyer don't stop other buyers
- [ ] Logging clear

**Files**: `server/src/main/worker/jobs/SendLeadsJob.ts`

---

### TICKET-024: Migration - Remove global send timing
**Type**: Database
**Priority**: P0 (CRITICAL)
**Estimate**: 1 hour

**Tasks**:
- Create migration: `postgres/migrations/YYYYMMDD_04_remove_global_send_timing.sql`
- Drop worker_settings.send_next_lead_at
- Drop worker_settings.delay_same_investor
- Drop worker_settings.delay_same_county
- Drop worker_settings.delay_same_state

**Acceptance Criteria**:
- [ ] Columns dropped
- [ ] Migration runs cleanly
- [ ] business_hours, expire_after_hours, cron_schedule remain

**Files**: `postgres/migrations/YYYYMMDD_04_remove_global_send_timing.sql`

---

### TICKET-025: Worker testing - automated buyer sends with worker gating
**Type**: Testing
**Priority**: P0 (CRITICAL)
**Estimate**: 6 hours

**Tasks**:
- Create 2 test buyers (different priorities, different timing, dispatch_mode='worker')
- Import 10 leads, verify all
- Set worker_enabled=true for 5 leads
- Set worker_enabled=false for 5 leads
- Enable worker
- Monitor for 1 hour
- Verify only worker_enabled=true leads are sent
- Verify priority order
- Verify per-buyer timing
- Verify buyer.next_send_at updates
- Verify business hours

**Acceptance Criteria**:
- [ ] Worker sends only worker_enabled=true leads
- [ ] Worker skips worker_enabled=false leads
- [ ] Higher priority buyer sends first
- [ ] Each buyer has independent timing
- [ ] buyer.next_send_at updates correctly
- [ ] No duplicate sends
- [ ] Business hours enforced

**Files**: N/A (Testing only)

---

## Sprint 5: Add New Buyers (Tickets #26-31)

### TICKET-026: Add Compass buyer (manual)
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**:
- Use admin UI to create Compass buyer
- Priority: 1, dispatch_mode: 'manual', webhook_url: <from team>, auth: <from team>
- Test manual send
- DO NOT enable auto_send (manual buyers)
- Monitor for 24 hours

**Acceptance Criteria**:
- [ ] Compass buyer created with dispatch_mode='manual'
- [ ] Manual send works
- [ ] auto_send=false (manual buyer)
- [ ] Stable for 24h

**Files**: N/A (Configuration only)

---

### TICKET-027: Add Sellers buyer (manual)
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**: Same as TICKET-026, priority 2, dispatch_mode='manual'

**Acceptance Criteria**: Same as TICKET-026

---

### TICKET-028: Add Pickle buyer (manual)
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**: Same as TICKET-026, priority 3, dispatch_mode='manual'

**Acceptance Criteria**: Same as TICKET-026

---

### TICKET-029: Add Motivated buyer (worker)
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**:
- Use admin UI to create Motivated buyer
- Priority: 4, dispatch_mode: 'worker', webhook_url: <from team>, auth: <from team>
- Test that manual send is blocked (worker buyer only)
- Enable auto_send=true
- Monitor for 24 hours

**Acceptance Criteria**:
- [ ] Motivated buyer created with dispatch_mode='worker'
- [ ] Manual send blocked (worker buyer)
- [ ] auto_send=true (worker buyer)
- [ ] Worker sends correctly
- [ ] Stable for 24h

**Files**: N/A (Configuration only)

---

### TICKET-030: Add Andy buyer (worker)
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**: Same as TICKET-029, priority 5, dispatch_mode='worker'

**Acceptance Criteria**: Same as TICKET-029

---

### TICKET-031: End-to-end priority pipeline test
**Type**: Testing
**Priority**: P0
**Estimate**: 4 hours

**Tasks**:
- Import lead, verify
- Manual send to Compass, Sellers, Pickle (manual buyers)
- Set worker_enabled=true
- Watch worker send to Motivated, Andy, iSpeedToLead (worker buyers)
- Verify allow_resell=false stops pipeline using lead_buyer_outcomes
- Verify allow_resell=true continues pipeline
- Test sold toggles

**Acceptance Criteria**:
- [ ] Manual buyers (Compass, Sellers, Pickle) sent manually
- [ ] Worker buyers (Motivated, Andy, iSpeedToLead) sent by worker
- [ ] Worker only sends worker_enabled=true leads
- [ ] If manual buyer sold (allow_resell=false), worker pipeline stops
- [ ] If manual buyer sold (allow_resell=true), worker pipeline continues
- [ ] All 6 buyers tested
- [ ] No duplicate sends
- [ ] Sold status tracked correctly

**Files**: N/A (Testing only)

---

## Sprint 6: Cleanup & Deprecation (Tickets #32-38)

### TICKET-032: Mark investors as deprecated in codebase
**Type**: Code Cleanup
**Priority**: P2
**Estimate**: 2 hours

**Tasks**:
- Add @deprecated comments to investorService, investorResource, investorDAO
- Hide investors UI in frontend (or show "DEPRECATED" banner)
- Do NOT delete code yet

**Acceptance Criteria**:
- [ ] Deprecated comments added
- [ ] Frontend shows deprecation notice
- [ ] Code still functional (rollback safety)

**Files**: `server/src/main/services/investorService.ts`, `server/src/main/resources/investorResource.ts`, `client/src/components/admin/adminInvestorsSection/`

---

### TICKET-033: Migration - Remove investor references ⚠️ IRREVERSIBLE
**Type**: Database
**Priority**: P0 (CRITICAL)
**Estimate**: 1 hour

**Tasks**:
- **DATABASE BACKUP REQUIRED BEFORE RUNNING**
- Create migration: `postgres/migrations/YYYYMMDD_05_remove_investors.sql`
- Drop send_log.investor_id
- Drop send_log.vendor_id
- Drop investors table
- Drop vendors table
- Drop leads.investor_id

**Acceptance Criteria**:
- [ ] **Database backup created**
- [ ] Migration runs cleanly
- [ ] Tables dropped
- [ ] Worker still functions

**Files**: `postgres/migrations/YYYYMMDD_05_remove_investors.sql`

---

### TICKET-034: Remove investor code from backend
**Type**: Code Cleanup
**Priority**: P1
**Estimate**: 1 hour

**Tasks**:
- Delete investorDAO.ts
- Delete investorService.ts
- Delete investorResource.ts
- Delete investorTypes.ts
- Remove from AutomatorServer.ts

**Acceptance Criteria**:
- [ ] All investor files deleted
- [ ] Build succeeds
- [ ] No import errors

**Files**: `server/src/main/data/investorDAO.ts`, `server/src/main/services/investorService.ts`, `server/src/main/resources/investorResource.ts`, `server/src/main/types/investorTypes.ts`, `server/src/main/AutomatorServer.ts`

---

### TICKET-035: Remove investor code from frontend
**Type**: Code Cleanup
**Priority**: P1
**Estimate**: 1 hour

**Tasks**:
- Delete adminInvestorsSection/ folder
- Delete investorService.ts
- Remove investor routes

**Acceptance Criteria**:
- [ ] All investor files deleted
- [ ] Build succeeds
- [ ] No navigation errors

**Files**: `client/src/components/admin/adminInvestorsSection/`, `client/src/services/investorService.ts`, `client/src/context/routes/AdminRoutes.tsx`

---

### TICKET-036: Delete iSpeedToLeadIAO.ts
**Type**: Code Cleanup
**Priority**: P1
**Estimate**: 15 minutes

**Tasks**:
- Delete `server/src/main/vendor/iSpeedToLeadIAO.ts`
- Remove all imports

**Acceptance Criteria**:
- [ ] File deleted
- [ ] No import errors

**Files**: `server/src/main/vendor/iSpeedToLeadIAO.ts`

---

### TICKET-037: Remove LEAD_VENDOR_URL from EnvConfig
**Type**: Configuration
**Priority**: P1
**Estimate**: 15 minutes

**Tasks**:
- Update `server/src/main/config/envConfig.ts`
- Remove leadVendorURL field
- Remove LEAD_VENDOR_URL from Doppler

**Acceptance Criteria**:
- [ ] Field removed
- [ ] Build succeeds
- [ ] Doppler config updated

**Files**: `server/src/main/config/envConfig.ts`

---

### TICKET-038: Update WorkerSettingsDAO to remove cooldown methods
**Type**: Backend (Data Layer)
**Priority**: P1
**Estimate**: 1 hour

**Tasks**:
- Update `server/src/main/data/workerSettingsDAO.ts`
- Remove updateNextLeadTime()
- Remove any references to deleted columns

**Acceptance Criteria**:
- [ ] No references to deleted columns
- [ ] getCurrentSettings() works

**Files**: `server/src/main/data/workerSettingsDAO.ts`

---

### TICKET-039: Update docs/AI/BASELINE files with buyers architecture
**Type**: Documentation
**Priority**: P2
**Estimate**: 2 hours

**Tasks**:
- Update `docs/AI/BASELINE/ARCHITECTURE.md` - Replace investor references with buyers
- Update `docs/AI/BASELINE/DAO_CONTRACT.md` - Add BuyerDAO and LeadBuyerOutcomeDAO
- Update `docs/AI/SERVICE_BEHAVIOR_SUMMARY.md` - Document BuyerDispatchService methods
- Update `docs/AI/DAO_SUMMARY.md` - Add new DAOs
- Update `docs/AI/SERVICES_MAP.md` - Add new services

**Acceptance Criteria**:
- [ ] All investor references replaced with buyers
- [ ] BuyerDAO documented
- [ ] LeadBuyerOutcomeDAO documented
- [ ] BuyerDispatchService documented
- [ ] Two-lane dispatch model explained

**Files**: `docs/AI/BASELINE/*.md`, `docs/AI/*.md`

---

### TICKET-040: Update CLAUDE.md with buyers architecture
**Type**: Documentation
**Priority**: P2
**Estimate**: 30 minutes

**Tasks**:
- Update `CLAUDE.md` with buyers section
- Document two-lane dispatch (manual vs worker)
- Document worker gating (worker_enabled flag)
- Update business rules section

**Acceptance Criteria**:
- [ ] Buyers section added
- [ ] Two-lane dispatch explained
- [ ] Worker gating documented
- [ ] Example buyer configurations included

**Files**: `CLAUDE.md`

---

### TICKET-041: Improve buyer priority management UX
**Type**: Frontend Enhancement
**Priority**: P3 (Future Enhancement)
**Estimate**: 4 hours

**Background**:
Current priority system uses simple integer values with unique constraints. While it works, it has UX limitations:
- Can't easily insert a buyer between positions (e.g., insert at position 7 when you have 10 buyers)
- Can't easily reorder multiple buyers
- Requires manually changing priorities of multiple buyers to make room

**Tasks**:
- Design better priority management UX (one of the following):
  - Option A: Drag-and-drop reordering (auto-reassigns all priorities)
  - Option B: "Insert before/after" buttons
  - Option C: Bulk priority reassignment tool
- Implement chosen approach in admin buyers UI
- Add "Reorder Buyers" interface
- Auto-reassign priorities on reorder to maintain sequence

**Acceptance Criteria**:
- [ ] Can easily insert buyer at any position without manual priority calculation
- [ ] Can move existing buyer up/down in priority order
- [ ] Priorities are automatically reassigned to maintain sequential order
- [ ] No gaps in priority sequence after reorder

**Technical Notes**:
- Current fixes handle gaps and soft-delete conflicts
- This ticket is about improving UX for intentional reordering

---

### TICKET-042: Add dispute tracking for sold leads
**Type**: Full Stack Feature
**Priority**: P2 (Future Enhancement)
**Estimate**: 8 hours

**Background**:
When leads are sold to buyers, buyers may dispute them later (wrong lead, bad data, etc.). VAs check buyer platforms (Compass, Sellers, etc.) and manually track disputes. Need system to record disputes with reasons for tracking and analytics.

**Use Case**:
1. VA checks Compass platform → sees lead XYZ was disputed
2. VA finds lead XYZ in admin dashboard → marked as "Sold to Compass"
3. VA clicks "Disputed" button next to "Sold"
4. Modal opens with form: buyer name (pre-filled), dispute reason (text/dropdown), submit
5. System records dispute with timestamp and VA user who logged it

**Database**:
- Extend `lead_buyer_outcomes` table with dispute fields:
  - `disputed` BOOLEAN DEFAULT false
  - `dispute_reason` TEXT
  - `disputed_at` TIMESTAMP
  - `disputed_by_user_id` UUID (references users table)

**Backend**:
- Add `disputeLead(leadId, buyerId, reason, userId)` to LeadService
- Add PUT /api/leads/:id/buyers/:buyerId/dispute endpoint
- Update getBuyerSendHistory to include dispute status

**Frontend**:
- Add "Disputed" button/badge next to "Sold" status in buyer send modal
- Create dispute modal with form:
  - Buyer name (read-only, pre-filled)
  - Dispute reason (textarea or dropdown with common reasons)
  - Submit button
- Show dispute status in buyer history (disputed badge, reason tooltip)
- Show dispute count in leads table (optional)

**Acceptance Criteria**:
- [ ] Can mark a sold lead as disputed with reason
- [ ] Dispute recorded with timestamp and user who logged it
- [ ] Dispute status visible in buyer send history
- [ ] Can view dispute reason in UI
- [ ] Can filter/search leads by disputed status (future)

**Technical Notes**:
- A lead can be sold to multiple buyers (Compass AND Sellers)
- Each buyer can independently dispute
- Disputes don't affect "sold" status (remain sold but flagged as disputed)
- User/VA roles and permissions needed (depends on auth system implementation)

**Dependencies**:
- User authentication and role management system
- TICKET-017 (buyer send modal) should be implemented first

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_add_dispute_tracking.sql`
- Backend: `server/src/main/services/leadService.ts`, `server/src/main/resources/leadResource.ts`
- Frontend: `client/src/components/common/leadDetails/buyerSendModal/DisputeModal.tsx`
- Consider using libraries like react-beautiful-dnd or SortableJS

**Files**: `client/src/components/admin/adminBuyersSection/AdminBuyersSection.tsx`

---

## Ticket Summary

| Sprint | Tickets | Total Hours | Risk Level |
|--------|---------|-------------|------------|
| Sprint 1 | #1-10 | 33 hours | Low |
| Sprint 2 | #11-18 | 32 hours | Medium |
| Sprint 3 | #19-20 | 4 hours | Medium |
| Sprint 4 | #21-25 | 25 hours | **HIGH** |
| Sprint 5 | #26-31 | 9 hours | Low |
| Sprint 6 | #32-40 | 9 hours | Medium |
| **Backlog** | #41 | 4 hours | Low |
| **TOTAL** | **41** | **116 hours** | - |

**Developer Days**: ~14-15 days (assuming 8-hour days)
**Calendar Time**: ~10 weeks (including testing, stabilization, buffer)
**Hackathon Mode**: ~3 days (with 2 people working intensively)
