# All Tickets (41 Total)

> **Note**: This document contains all 41 implementation tickets organized by sprint. Each ticket includes acceptance criteria, files affected, and testing requirements. See `09_IMPLEMENTATION_ORDER.md` for sprint breakdown and deployment strategies.

---

## 📊 Sprint Status (Last Updated: 2026-03-02)

| Sprint | Status | Tickets | Progress |
|--------|--------|---------|----------|
| **Sprint 1** | 🟢 COMPLETE | #1-10 | 10/10 (100%) |
| **Sprint 2** | 🟢 COMPLETE | #11-18 | 8/8 (100%) |
| **Sprint 3** | 🟢 COMPLETE | #19-20 + Bug Fix | 3/3 (100%) |
| **Sprint 4** | 🟢 COMPLETE | #21-25 | 5/5 (100%) |
| **Sprint 5** | 🟢 COMPLETE | #26-31 | 6/6 (100%) |
| **Sprint 6** | 🟢 COMPLETE | #32-38 | 7/7 (100%) |
| **Sprint 7** | 🟢 COMPLETE | TICKET-046 | 1/1 (100%) |
| **Backlog** | ⬜ TODO | #39-41 | 0/3 (0%) |

**Overall Progress:** 38/41 core tickets (93%) + 2 additional features (BUG-001, TICKET-046)
**Remaining:** 3 enhancement tickets (documentation & UX improvements)

**Current Status:** All core functionality complete - TICKET-046 merged to develop
**Next Up:** QA session and user feedback

**Sprint 4 Summary:**
- ✅ TICKET-021: Refactored WorkerService to use processAllBuyers()
- ✅ TICKET-022: Added per-buyer queue processing to BuyerDispatchService
- ✅ TICKET-023: Updated SendLeadsJob to call processAllBuyers()
- ✅ TICKET-024: Migration already complete (refactor_worker_settings_to_buyers.sql)
- ✅ TICKET-025: Worker testing complete - manual testing confirmed functionality

**Sprint 3 Summary:**
- ✅ TICKET-019: Worker settings refactor and lead reuse system
- ✅ TICKET-020: Database verification (Compass, Sellers, iSpeedToLead)
- ✅ BUG-001: Bug fix for WorkerSettingsDAO after migration (not in original plan)

**Note:** BUG-001 was mistakenly labeled TICKET-021 in commit messages. The real TICKET-021 is in Sprint 4.

---

## Sprint 1: Foundation & Admin UI (Tickets #1-10) ✅ COMPLETE

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

## Sprint 2: Dispatch Logic & Manual Sends (Tickets #11-18) ✅ COMPLETE

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

## Sprint 3: Worker Refactor & iSpeedToLead (Tickets #19-20) 🟡 IN PROGRESS

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

## Sprint 4: Worker Switchover (Tickets #21-25) ✅ COMPLETE

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

## Sprint 5: Add New Buyers (Tickets #26-31) ✅ COMPLETE

**Status:** 🟢 All buyers added via migration (Compass, Sellers, iSpeedToLead) + manual configuration (Pickle, Motivated, Andy)
**Completed:** 2026-02-28
**Method:** Database migration + Admin UI configuration

### TICKET-026: Add Compass buyer (manual) ✅
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
- [x] Compass buyer created with dispatch_mode='manual'
- [x] Manual send works
- [x] auto_send=false (manual buyer)
- [x] Stable for 24h

**Implementation:** Created via migration `20260228000000.do._backfill_ispeedtolead_buyer.sql`
**Files**: `postgres/migrations/20260228000000.do._backfill_ispeedtolead_buyer.sql`

---

### TICKET-027: Add Sellers buyer (manual) ✅
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**: Same as TICKET-026, priority 2, dispatch_mode='manual'

**Acceptance Criteria**: ✅ All criteria met (created via migration)
**Implementation:** Created via migration `20260228000000.do._backfill_ispeedtolead_buyer.sql`

---

### TICKET-028: Add Pickle buyer (manual) ✅
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**: Same as TICKET-026, priority 3, dispatch_mode='manual'

**Acceptance Criteria**: ✅ All criteria met (configured via Admin UI)
**Implementation:** Manual configuration via Admin UI (buyer exists in production)

---

### TICKET-029: Add Motivated buyer (worker) ✅
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
- [x] Motivated buyer created with dispatch_mode='worker'
- [x] Manual send blocked (worker buyer)
- [x] auto_send=true (worker buyer)
- [x] Worker sends correctly
- [x] Stable for 24h

**Implementation:** Manual configuration via Admin UI (buyer exists in production)

---

### TICKET-030: Add Andy buyer (worker) ✅
**Type**: Configuration
**Priority**: P1
**Estimate**: 1 hour

**Tasks**: Same as TICKET-029, priority 5, dispatch_mode='worker'

**Acceptance Criteria**: ✅ All criteria met (configured via Admin UI)
**Implementation:** Manual configuration via Admin UI (buyer exists in production)

---

### TICKET-031: End-to-end priority pipeline test ✅
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
- [x] Manual buyers (Compass, Sellers, Pickle) sent manually
- [x] Worker buyers (Motivated, Andy, iSpeedToLead) sent by worker
- [x] Worker only sends worker_enabled=true leads
- [x] If manual buyer sold (allow_resell=false), worker pipeline stops
- [x] If manual buyer sold (allow_resell=true), worker pipeline continues
- [x] All 6 buyers tested
- [x] No duplicate sends
- [x] Sold status tracked correctly

**Implementation:** Tested in production environment
**Status:** ✅ All pipeline functionality verified and stable

---

## Sprint 6: Cleanup & Deprecation (Tickets #32-38) ✅ COMPLETE

**Status:** 🟢 All investor/vendor code removed via PR #24
**Completed:** 2026-02-28
**PR:** #24 (`sprint-6-cleanup-deprecation`)
**Commits:** 10 commits removing all deprecated code

### TICKET-032: Mark investors as deprecated in codebase ✅
**Type**: Code Cleanup
**Priority**: P2
**Estimate**: 2 hours

**Status:** ✅ Skipped - Went straight to removal instead of deprecation
**Rationale:** Buyers system fully implemented and stable, no need for deprecation period

---

### TICKET-033: Migration - Remove investor references ⚠️ IRREVERSIBLE ✅
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
- [x] **Database backup created**
- [x] Migration runs cleanly
- [x] Tables dropped
- [x] Worker still functions

**Implementation:** Migration `20260228180801.do._drop_investors_and_vendors_tables.sql` - PR #24
**Commit:** `df0636c`

---

### TICKET-034: Remove investor code from backend ✅
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
- [x] All investor files deleted
- [x] Build succeeds
- [x] No import errors

**Implementation:** Commit `5284e1b` - PR #24

---

### TICKET-035: Remove investor code from frontend ✅
**Type**: Code Cleanup
**Priority**: P1
**Estimate**: 1 hour

**Tasks**:
- Delete adminInvestorsSection/ folder
- Delete investorService.ts
- Remove investor routes

**Acceptance Criteria**:
- [x] All investor files deleted
- [x] Build succeeds
- [x] No navigation errors

**Implementation:** Commit `caf3519` - PR #24

---

### TICKET-036: Delete iSpeedToLeadIAO.ts ✅
**Type**: Code Cleanup
**Priority**: P1
**Estimate**: 15 minutes

**Tasks**:
- Delete `server/src/main/vendor/iSpeedToLeadIAO.ts`
- Remove all imports

**Acceptance Criteria**:
- [x] File deleted
- [x] No import errors

**Implementation:** Commit `6bd747c` - PR #24

---

### TICKET-037: Remove LEAD_VENDOR_URL from EnvConfig ✅
**Type**: Configuration
**Priority**: P1
**Estimate**: 15 minutes

**Tasks**:
- Update `server/src/main/config/envConfig.ts`
- Remove leadVendorURL field
- Remove LEAD_VENDOR_URL from Doppler

**Acceptance Criteria**:
- [x] Field removed
- [x] Build succeeds
- [x] Doppler config updated

**Implementation:** Commit `7b488bc` - PR #24

---

### TICKET-038: Update WorkerSettingsDAO to remove cooldown methods ✅
**Type**: Backend (Data Layer)
**Priority**: P1
**Estimate**: 1 hour

**Tasks**:
- Update `server/src/main/data/workerSettingsDAO.ts`
- Remove updateNextLeadTime()
- Remove any references to deleted columns

**Acceptance Criteria**:
- [x] No references to deleted columns
- [x] getCurrentSettings() works

**Implementation:** Migration `20260228185645.do._refactor_worker_settings_to_buyers.sql` - PR #24

---

## Remaining Enhancement Tickets (Backlog)

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

---

### TICKET-043: Refactor BuyerSendModal to paginated table with backend filtering
**Type**: Full Stack Refactor
**Priority**: P2 (Future Enhancement)
**Estimate**: 12 hours

**Background**:
Current implementation fetches ALL buyers and filters client-side. This is inefficient and doesn't scale. Modal should be a proper data table with pagination, search, and filters - similar to the "counties beats" feature in the other product.

**Current Problems**:
- Frontend fetches all buyers, then filters by dispatch_mode (inefficient)
- No pagination (won't scale with many buyers)
- No search/filter capabilities
- Hard to find specific buyer
- Can't manually send to worker-only buyers (may want to override automation)

**Desired Features**:
1. **Backend Filtering**:
   - API should accept filters: `dispatch_mode`, `search`, `page`, `limit`
   - Return paginated results with count
   - Filter on backend, not frontend

2. **Table UI** (like counties beats):
   - MUI DataGrid or similar table component
   - Columns: Buyer Name, Priority, Dispatch Mode, Send Count, Last Sent, Actions
   - Pagination controls (rows per page, page navigation)
   - Search bar (filter by buyer name)
   - Tabs or filter dropdown for dispatch_mode

3. **Dispatch Mode Handling**:
   - Show ALL buyers (manual, worker, both)
   - User can manually send to any buyer (including worker-only as override)
   - Visual indicators for dispatch mode (chips/badges)

4. **Actions Column**:
   - Send button (with loading state)
   - Sold toggle (creates outcome record)
   - View send history (expandable row or modal)

5. **Enable Worker Button**:
   - Keep at bottom/top of modal
   - Sets worker_enabled=true for automated processing

**Action Items**:
- [ ] **USER**: Open Claude Code in other project with counties beats feature
- [ ] **USER**: Ask Claude to explain implementation (table, pagination, filters)
- [ ] **USER**: Provide implementation details to Claude for this project
- [ ] **DEV**: Update API endpoint to accept filters and return paginated buyers
- [ ] **DEV**: Replace simple list UI with MUI DataGrid table
- [ ] **DEV**: Add search bar and dispatch_mode filter
- [ ] **DEV**: Implement pagination controls
- [ ] **DEV**: Keep send/sold/worker actions functional

**Backend Changes**:
- Update `GET /api/leads/:id/buyers` to accept query params:
  - `page`, `limit` (pagination)
  - `search` (buyer name filter)
  - `dispatch_mode` (optional filter: 'manual', 'worker', 'both')
- Return: `{ buyers: [], count: number }`

**Frontend Changes**:
- Replace `BuyerSendModal` list UI with MUI DataGrid
- Add search input (debounced)
- Add pagination controls
- Add dispatch_mode filter/tabs
- Fetch data on page/filter change

**Acceptance Criteria**:
- [ ] Backend filters buyers before returning (not client-side)
- [ ] Pagination works (10/25/50 rows per page)
- [ ] Search filters by buyer name
- [ ] Can filter by dispatch_mode
- [ ] Send, Sold, and Enable Worker actions still work
- [ ] Performance: Fast even with 100+ buyers

**Dependencies**:
- Reference implementation from counties beats feature in other project

**Files**:
- Backend: `server/src/main/services/leadService.ts`, `server/src/main/resources/leadResource.ts`
- Frontend: `client/src/components/common/leadDetails/buyerSendModal/BuyerSendModal.tsx`

**Notes**:
- Current simple implementation works for MVP (10-20 buyers)
- This refactor needed when scaling to many buyers or need advanced filtering
- User will provide reference implementation from other project
- Consider using libraries like react-beautiful-dnd or SortableJS

**Files**: `client/src/components/admin/adminBuyersSection/AdminBuyersSection.tsx`

---

### TICKET-044: Fix CSV state validation - clean state values before enum validation
**Type**: Backend Bug Fix (QA - Sprint 2)
**Priority**: P0 (Critical)
**Estimate**: 30 minutes

**Background**:
During QA testing, CSV import failed with error:
```
error: invalid input value for enum us_state: "GA."
```
CSV files have state values with trailing periods (e.g., "GA.", "TX.") but the database us_state enum expects clean values ("GA", "TX"). Need to normalize/clean state values before validation.

**Tasks**:
- Update CSV parsing middleware to clean state values
- Trim whitespace and remove trailing periods
- Apply cleaning before enum validation
- Test with sample CSV containing "GA.", "TX.", etc.

**Acceptance Criteria**:
- [ ] CSV with "GA." imports successfully as "GA"
- [ ] State values are trimmed and normalized
- [ ] No database enum errors
- [ ] Existing clean state values still work

**Files**:
- `server/src/main/middleware/parseAndValidateCSV.ts`

---

### TICKET-045: Fix frontend upload modal error handling
**Type**: Frontend Bug Fix (QA - Sprint 2)
**Priority**: P0 (Critical)
**Estimate**: 45 minutes

**Background**:
During QA testing, when CSV import fails on backend (e.g., due to validation errors), the frontend upload modal:
- Keeps showing loading spinner indefinitely
- Doesn't display error message to user
- Doesn't allow retry or close
- User has to refresh page to recover

**Current Behavior**:
1. User uploads CSV
2. Backend returns 400/500 error with message
3. Frontend catches error but doesn't update UI
4. Modal stays in loading state forever

**Expected Behavior**:
1. User uploads CSV
2. Backend returns error
3. Frontend shows error message (alert/snackbar)
4. Loading stops
5. User can close modal and retry

**Tasks**:
- Find CSV upload modal component
- Add error state handling to catch failed API responses
- Stop loading spinner on error
- Display error message to user (MUI Alert or Snackbar)
- Allow user to close modal and retry upload
- Test with intentionally failing CSV

**Acceptance Criteria**:
- [ ] Error messages are displayed to user
- [ ] Loading spinner stops on error
- [ ] Modal can be closed after error
- [ ] User can retry upload after error
- [ ] Success case still works

**Files**:
- `client/src/components/*/UploadCSVModal.tsx` (or similar - need to locate)

---

## QA Session - Sprint 2

**Date**: 2026-02-28
**Branch**: `qa-sprint-2-bug-fixes`
**Scope**: Test all Sprint 2 functionality (buyer dispatch system, modal, worker columns)

### Bugs Found:
1. **TICKET-044**: CSV import crashes with "invalid input value for enum us_state: 'GA.'" - state values have trailing periods
2. **TICKET-045**: Frontend upload modal doesn't show errors, keeps loading indefinitely when backend fails

### Testing Notes:
- CSV sample file has states like "GA.", "TX." with periods
- Backend validation rejects these as invalid enum values
- Frontend error handling missing in upload flow

**Status**: 🟢 COMPLETE - Merged via PR #29 (32 commits)

---

### TICKET-046: Implement source-specific API key authentication for lead intake ✅
**Type**: Full Stack Feature
**Priority**: P1 (High)
**Estimate**: 4 hours
**Actual**: 6 hours (across 2 sessions)
**Completed**: 2026-03-02
**PR**: #29 (32 commits)
**Branch**: `feature/ticket-046-source-api-auth`

**Background**:
Currently, the `/api/leads-intake` endpoint uses a single global API key (`LEAD_INTAKE_API_KEY` from Doppler) for authentication. This doesn't allow tracking which source sent each lead or provide per-source access control.

**Completed Implementation**:
✅ Database migration (sources & campaigns tables with source_id FK)
✅ Bearer token authentication (64-char hex, high-entropy, no encryption needed)
✅ Source & Campaign management (full CRUD with token generation)
✅ API intake authentication via middleware
✅ Lead association with source/campaign
✅ Admin UI for sources with one-time token display
✅ CSV import association with "CSV_IMPORT" source
✅ Removed global county blacklists (now per-buyer for future)
✅ Fixed null safety issues and parameter mismatches
✅ Updated campaign endpoints for backward compatibility

**Requirements**:
Each affiliate should have their own unique API key. When a lead comes via the intake API:
1. Extract `x-api-key` header
2. Look up affiliate by API key
3. Authenticate the request
4. Associate the lead with that affiliate (via campaign_id)
5. Track which affiliate sent the lead for reporting/analytics

**Database Changes**:
Add API key field to affiliates or campaigns table:
```sql
-- Option A: Add to affiliates table
ALTER TABLE affiliates ADD COLUMN api_key_encrypted TEXT;
CREATE UNIQUE INDEX idx_affiliates_api_key ON affiliates(api_key_encrypted) WHERE deleted IS NULL;

-- Option B: Add to campaigns table (more granular)
ALTER TABLE campaigns ADD COLUMN api_key_encrypted TEXT;
CREATE UNIQUE INDEX idx_campaigns_api_key ON campaigns(api_key_encrypted) WHERE deleted IS NULL;
```

**Backend Changes**:
1. Update `apiKeyAuth.ts` middleware:
   - Remove check for `LEAD_INTAKE_API_KEY`
   - Query affiliates/campaigns table by API key
   - Attach affiliate/campaign info to `req` object
   - Return 401 if API key not found

2. Update `leadIntakeResource.ts`:
   - Get affiliate/campaign from `req` (set by middleware)
   - Pass to `leadService.importLeadsFromApi()`
   - Associate leads with affiliate's campaign

3. Update `leadService.importLeadsFromApi()`:
   - Accept `campaign_id` parameter
   - Set `campaign_id` on created leads
   - This also sets `affiliate_id` via campaign relationship

**Frontend Changes**:
1. Add API key management to admin panel:
   - Affiliates/Campaigns admin page
   - "Generate API Key" button
   - Show/copy/regenerate API key
   - Encrypt before storing in database

2. Display API key to affiliate (one-time show):
   - Modal: "Your API key: XXXXX - Save this now, you won't see it again"
   - Copy to clipboard button

**Security Considerations**:
- API keys stored encrypted (application-level AES-256, like buyer auth tokens)
- Use cryptographically secure random generation (Node crypto)
- Consider key rotation/expiration (future enhancement)
- Rate limiting per affiliate (future enhancement)

**Acceptance Criteria** (Updated to use "source" instead of "affiliate"):
- [x] Each source can have unique API token (64-char hex, Bearer auth)
- [x] Token can be generated/regenerated via admin UI with one-time display
- [x] Lead intake endpoint authenticates by Bearer token
- [x] Leads are associated with correct source/campaign
- [x] CSV imports associated with "CSV_IMPORT" source automatically
- [x] Invalid token returns 401 Unauthorized
- [x] Tokens stored in plaintext (high-entropy = secure)
- [x] Can track which source sent each lead
- [x] Campaign auto-creation on API intake
- [x] Global county blacklists removed (per-buyer for future)

**Testing**:
- Generate API key for test affiliate
- Send lead via intake endpoint with affiliate's API key
- Verify lead is associated with correct affiliate/campaign
- Try with invalid API key → should fail with 401
- Regenerate API key → old key should stop working

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_add_affiliate_api_keys.sql`
- Backend: `server/src/main/middleware/apiKeyAuth.ts`, `server/src/main/resources/leadIntakeResource.ts`, `server/src/main/services/leadService.ts`
- Frontend: `client/src/components/admin/adminAffiliatesSection/` or `adminCampaignsSection/`

**Dependencies**:
- Encryption utility (reuse buyer auth encryption logic)
- Admin UI for affiliates/campaigns management

**Notes**:
- For now, using a TODO bypass to allow testing without authentication
- This ticket must be completed before production launch
- Consider whether API keys belong on affiliates or campaigns table (campaigns = more granular)

---

### TICKET-047: Remove legacy "Send Now" button and vendor receive mock system
**Type**: Code Cleanup
**Priority**: P1 (High)
**Estimate**: 1 hour

**Background**:
The old "Send Now" button in the leads table sent leads to a mock vendor endpoint that stored data in `vendor_receive` table. This is now obsolete because:
- Replaced by buyer dispatch system (send via Buyers modal)
- Should send to specific buyers, not generic vendor endpoint
- Mock data cluttering database

**Frontend Removal**:
1. Remove "Send Now" column from LeadsTable
   - Remove column definition
   - Remove `handleSendLead` function
   - Remove `sendLead` service call
   - Keep "Verify Lead" button (still needed for unverified leads)

2. Update lead.service.tsx
   - Remove `sendLead()` method (replaced by `sendLeadToBuyer()`)

**Backend Removal**:
1. Remove vendor receive files:
   - `server/src/main/data/vendorReceiveDAO.ts`
   - `server/src/main/services/vendorReceiveService.ts`
   - `server/src/main/resources/vendorReceiveResource.ts`

2. Update AutomatorServer.ts
   - Remove vendorReceiveResource registration
   - Remove vendorReceiveService/DAO from container

3. Database cleanup (optional - can wait for Sprint 6):
   - Drop `vendor_receive` table (if it exists)
   - Part of investor/vendor deprecation in Sprint 6

**Acceptance Criteria**:
- [ ] "Send Now" column removed from leads table UI
- [ ] Verify button still works for unverified leads
- [ ] Buyers modal is the only way to send leads
- [ ] vendorReceive files deleted
- [ ] Build succeeds without errors
- [ ] No imports referencing deleted files

**Files**:
- Frontend: `client/src/components/common/leadsSection/leadsTable/LeadsTable.tsx`, `client/src/services/lead.service.tsx`
- Backend: `server/src/main/data/vendorReceiveDAO.ts`, `server/src/main/services/vendorReceiveService.ts`, `server/src/main/resources/vendorReceiveResource.ts`, `server/src/main/AutomatorServer.ts`

**Notes**:
- User verified this is no longer needed during QA
- The buyer dispatch system is the replacement
- Database table can be dropped in Sprint 6 with other cleanup

---

**Status**: 🟢 Sprint 1 COMPLETE | 🟢 Sprint 2 COMPLETE | 🟡 Sprint 3 IN PROGRESS (TICKET-019)

**Last Updated**: 2026-02-28

**Progress**: 18/41 tickets complete (44%) + 1 in progress

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
