# All Tickets (41 Total)

> **Note**: This document contains all 41 implementation tickets organized by sprint. Each ticket includes acceptance criteria, files affected, and testing requirements. See `09_IMPLEMENTATION_ORDER.md` for sprint breakdown and deployment strategies.

---

## 📊 Sprint Status (Last Updated: 2026-03-12)

| Sprint | Status | Tickets | Progress |
|--------|--------|---------|----------|
| **Sprint 1** | 🟢 COMPLETE | #1-10 | 10/10 (100%) |
| **Sprint 2** | 🟢 COMPLETE | #11-18 | 8/8 (100%) |
| **Sprint 3** | 🟢 COMPLETE | #19-20 + Bug Fix | 3/3 (100%) |
| **Sprint 4** | 🟢 COMPLETE | #21-25 | 5/5 (100%) |
| **Sprint 5** | 🟢 COMPLETE | #26-31 | 6/6 (100%) |
| **Sprint 6** | 🟢 COMPLETE | #32-38 | 7/7 (100%) |
| **Sprint 7** | 🟢 COMPLETE | TICKET-046 | 1/1 (100%) |
| **Sprint 8** | 🟡 IN PROGRESS | #048-057 | 3/10 (30%) |
| **Backlog** | ⬜ TODO | #39-41 | 0/3 (0%) |

**Overall Progress:** 41/57 tickets complete

**Current Status:** TICKET-057 (user roles & permissions) complete — PR #11 open
**Next Up:** TICKET-048 (buyer ping system), TICKET-052 (call queue), TICKET-053 (trash reasons)

### Sprint 8 Ticket Status
| Ticket | Title | Status |
|--------|-------|--------|
| TICKET-048 | Buyer ping system | ⏸ On hold |
| TICKET-049 | Buyer auction/waterfall | ⏸ On hold |
| TICKET-050 | Lead manager system | ✅ Done — PR merged |
| TICKET-051 | Activity tracking | ✅ Done — PR #10 merged |
| TICKET-052 | Call queue for leads | 🔲 TODO |
| TICKET-053 | Trash reasons master table | 🔲 TODO |
| TICKET-054 | Disputes system expansion | 🔲 TODO |
| TICKET-055 | Configurable worker delays | 🔲 TODO |
| TICKET-056 | Enhanced reporting dashboard | 🔲 TODO |
| TICKET-057 | User roles & permissions system | ✅ Done — PR #11 merged |
| TICKET-058 | Dispute system for sent leads | 🔲 TODO |
| TICKET-059 | Dynamic lead payload blob | 🔲 TODO |
| TICKET-060 | Call queue permission + queue-for-call action | 🔲 TODO |

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

## Sprint 8: Foundation Features (Post-Brainstorming) (Tickets #48-50)

### TICKET-048: Implement standard ping system for buyers
**Type**: Full Stack Feature
**Priority**: P1 (High)
**Estimate**: 12 hours
**Sprint**: 8 (Foundation)
**Date Created**: 2026-03-06

**Background**:
Some buyers require a "ping" (pre-qualification check) before accepting a lead. The buyer needs to validate the lead meets their criteria before committing to purchase.

**Flow**:
1. Lead ready to send to buyer
2. If buyer has `requires_ping=true`, send ping request first
3. Buyer webhook responds with acceptance/rejection (200-299 = accept, 400+ = reject)
4. If accepted, send full lead payload immediately
5. If rejected, skip to next buyer in priority queue

**Database Changes**:
```sql
-- Migration: add_buyer_ping_flags.sql
ALTER TABLE buyers
ADD COLUMN requires_ping BOOLEAN DEFAULT false;

CREATE INDEX idx_buyers_requires_ping ON buyers(requires_ping) WHERE requires_ping = true;
```

**Backend Changes**:
1. Update BuyerType to include `requires_ping: boolean`
2. Update BuyerDAO CRUD to handle new field
3. Update BuyerWebhookAdapter:
   - Add `sendPing(url, pingPayload, authConfig)` method
   - Ping payload: minimal data (lead ID, county, state, basic info)
   - Timeout: 5 seconds
4. Update BuyerDispatchService:
   - In `sendLeadToBuyer()`, check if buyer requires ping
   - If yes, call `sendPing()` first
   - Handle acceptance (200-299) → send full lead
   - Handle rejection (400+) → log rejection, return without sending
   - Handle timeout → treat as rejection
5. Update send_log to record ping attempts:
   - `action` field: 'ping' vs 'send'
   - Store ping response separately

**Frontend Changes**:
1. Update BuyerEditDialog:
   - Add "Requires Ping" checkbox
   - Help text: "Buyer must approve lead before receiving full payload"
2. Update buyer table to show ping status (icon/badge)
3. Update send history in BuyerSendModal:
   - Show ping attempts and responses
   - Differentiate ping vs full send in history

**Ping Payload Format**:
```json
{
  "ping": true,
  "lead_id": "uuid",
  "county": "Miami-Dade",
  "state": "FL",
  "zipcode": "33010",
  "estimated_value": 250000
}
```

**Full Send Payload** (if ping accepted):
```json
{
  "ping": false,
  "lead_id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "555-1234",
  "email": "john@example.com",
  "address": "123 Main St",
  "city": "Miami",
  "county": "Miami-Dade",
  "state": "FL",
  "zipcode": "33010",
  // ... all lead fields
}
```

**Acceptance Criteria**:
- [ ] Buyers table has `requires_ping` column
- [ ] Admin UI shows/edits requires_ping setting
- [ ] When buyer requires ping, ping is sent first
- [ ] Ping acceptance (200-299) triggers full lead send
- [ ] Ping rejection (400+) skips buyer and logs reason
- [ ] Ping timeout (5s) treated as rejection
- [ ] Send history shows ping attempts separately
- [ ] Worker respects ping logic (doesn't skip pings)
- [ ] Manual send UI respects ping logic

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_add_buyer_ping_flags.sql`
- Backend: `server/src/main/types/buyerTypes.ts`, `server/src/main/data/buyerDAO.ts`, `server/src/main/adapters/buyerWebhookAdapter.ts`, `server/src/main/services/buyerDispatchService.ts`
- Frontend: `client/src/components/admin/adminBuyersSection/BuyerEditDialog.tsx`, buyer table component, send history modal

**Testing**:
1. Create test buyer with requires_ping=true
2. Mock webhook that accepts pings (returns 200)
3. Send lead → verify ping sent first, then full payload
4. Mock webhook that rejects pings (returns 400)
5. Send lead → verify ping sent, full payload NOT sent
6. Mock webhook with timeout → verify treated as rejection

**Dependencies**:
- None (self-contained feature)

**Notes**:
- Prerequisite for TICKET-049 (Auction Ping System)
- Ping timeout: 5 seconds (configurable in future)
- Ping response format: standard HTTP status codes

---

### TICKET-049: Implement auction ping system for buyer price competition
**Type**: Full Stack Feature
**Priority**: P1 (High)
**Estimate**: 16 hours
**Sprint**: 10 (Advanced Features)
**Date Created**: 2026-03-06
**Dependencies**: TICKET-048 (Standard Ping System)

**Background**:
Multiple buyers can compete on price for the same lead. When a lead reaches buyers with `auction_ping=true`, the system pings all of them simultaneously, collects their bid prices, and sends the lead to the highest bidder.

**Flow**:
1. Lead reaches buyer #3 in priority queue
2. Check if buyer #3 has `auction_ping=true`
3. Look ahead in queue for other buyers with `auction_ping=true`
4. Ping all auction buyers simultaneously (buyers #3, #4, #5)
5. Collect responses with bid prices within timeout (5 seconds)
6. Select highest bidder
7. Send lead to winning buyer
8. Log auction results for all participants

**Database Changes**:
```sql
-- Migration: add_auction_ping_system.sql
ALTER TABLE buyers
ADD COLUMN auction_ping BOOLEAN DEFAULT false,
ADD COLUMN minimum_bid DECIMAL(10,2); -- optional floor price

CREATE INDEX idx_buyers_auction_ping ON buyers(auction_ping) WHERE auction_ping = true;

CREATE TABLE auction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  winning_buyer_id UUID REFERENCES buyers(id),
  winning_bid DECIMAL(10,2),
  participant_count INTEGER,
  participants JSONB, -- [{buyer_id, bid, response_time_ms}, ...]
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auction_results_lead_id ON auction_results(lead_id);
CREATE INDEX idx_auction_results_created ON auction_results(created);
```

**Backend Changes**:
1. Update BuyerType to include `auction_ping: boolean`, `minimum_bid?: number`
2. Update BuyerDAO CRUD to handle new fields
3. Create AuctionService:
   - `identifyAuctionGroup(currentBuyerPriority, allBuyers)` - finds consecutive auction_ping buyers
   - `conductAuction(leadId, auctionBuyers)` - pings all buyers simultaneously
   - `selectWinner(responses)` - picks highest bidder
   - `logAuctionResults(leadId, winnerBuyerId, responses)` - saves to auction_results table
4. Update BuyerDispatchService:
   - In `processBuyerQueue()`, check for auction_ping
   - If found, call AuctionService.conductAuction()
   - Send lead to winner
   - Skip other auction participants
5. Update BuyerWebhookAdapter:
   - Auction ping payload includes `auction: true` flag
   - Response must include `bid` field

**Frontend Changes**:
1. Update BuyerEditDialog:
   - Add "Auction Ping" checkbox
   - Add "Minimum Bid" number field (optional)
   - Help text: "Compete with other buyers on price for leads"
2. Create AuctionResultsView:
   - Show auction history for admins
   - Columns: Lead, Date, Winner, Winning Bid, Participants
   - Click row → see all bids and response times
3. Update lead history to show auction results:
   - "Won Auction" badge for winner
   - "Lost Auction" badge for participants
   - Show bid amounts

**Auction Ping Payload Format**:
```json
{
  "ping": true,
  "auction": true,
  "lead_id": "uuid",
  "county": "Miami-Dade",
  "state": "FL",
  "zipcode": "33010",
  "estimated_value": 250000,
  "minimum_bid": 50.00
}
```

**Expected Response Format**:
```json
{
  "accept": true,
  "bid": 75.00
}
```

**Acceptance Criteria**:
- [ ] Buyers table has `auction_ping` and `minimum_bid` columns
- [ ] Admin UI shows/edits auction settings
- [ ] System identifies consecutive auction_ping buyers
- [ ] All auction buyers pinged simultaneously (Promise.allSettled)
- [ ] Highest bid wins (ties → first responder wins)
- [ ] Bids below minimum_bid rejected
- [ ] Winner receives full lead payload
- [ ] Losers skipped (not sent full payload)
- [ ] Auction results logged to database
- [ ] Auction results visible in admin UI
- [ ] Timeout handled gracefully (5s per buyer)
- [ ] Partial failures handled (some buyers timeout, others respond)

**Edge Cases**:
1. **All buyers timeout** → Skip entire auction group, continue to next buyer
2. **No valid bids** → Skip auction group
3. **Single auction buyer** → Treat as standard ping (no auction)
4. **Tie on price** → First responder wins
5. **Buyer accepts but no bid field** → Reject response, treat as timeout

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_add_auction_ping_system.sql`
- Backend: `server/src/main/types/buyerTypes.ts`, `server/src/main/data/buyerDAO.ts`, `server/src/main/services/auctionService.ts`, `server/src/main/services/buyerDispatchService.ts`, `server/src/main/adapters/buyerWebhookAdapter.ts`
- Frontend: `client/src/components/admin/adminBuyersSection/BuyerEditDialog.tsx`, auction results view, lead history modal

**Testing**:
1. Create 3 test buyers with auction_ping=true (priorities 3,4,5)
2. Mock all 3 buyers to respond with different bids ($50, $75, $60)
3. Send lead → verify buyer #4 wins (highest bid)
4. Verify auction_results record created
5. Test timeout scenario (buyer #3 times out, #4 and #5 respond)
6. Test all timeout scenario → lead continues to next non-auction buyer
7. Test tie scenario → first responder wins

**Performance Considerations**:
- Use Promise.allSettled for parallel pings (non-blocking)
- 5-second timeout per buyer (configurable)
- Auction group limited to consecutive buyers (don't skip priorities)

**Notes**:
- Revenue optimization feature (maximize per-lead value)
- More complex than standard ping (parallel execution, winner selection)
- Requires extensive testing and monitoring
- Consider adding auction metrics to dashboard

---

### TICKET-050: Implement lead manager system for campaign tracking
**Type**: Full Stack Feature
**Priority**: P0 (High - Foundation)
**Estimate**: 8 hours
**Sprint**: 8 (Foundation)
**Date Created**: 2026-03-06

**Background**:
Currently, campaigns are linked only to sources. The Northstar system uses a dual-axis model where campaigns belong to both a SOURCE (e.g., Facebook, Google) and a MANAGER (e.g., John Smith, sales person). This enables tracking lead utilization and performance by both source AND manager.

**Current Structure**:
```
Source (1:N) → Campaigns
```

**Desired Structure** (Mirror Northstar):
```
Source (1:N) → Campaigns
Manager (1:N) → Campaigns
Campaign (N:1) → Source
Campaign (N:1) → Manager
```

**Example**:
- **Source:** Facebook
- **Manager:** John Smith (sales person managing Facebook campaigns)
- **Campaign:** "Summer Leads 2026" (linked to Facebook source AND John as manager)

**Use Cases**:
1. Track which manager is responsible for each campaign
2. Report on lead utilization by manager (manager performance)
3. Manager compensation tied to their campaigns
4. Sales team accountability

**Database Changes**:
```sql
-- Migration: create_lead_managers_table.sql
CREATE TABLE lead_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created TIMESTAMPTZ DEFAULT NOW(),
  modified TIMESTAMPTZ DEFAULT NOW(),
  deleted TIMESTAMPTZ
);

CREATE INDEX idx_lead_managers_active ON lead_managers(active) WHERE active = true AND deleted IS NULL;
CREATE INDEX idx_lead_managers_name ON lead_managers(name) WHERE deleted IS NULL;

ALTER TABLE campaigns
ADD COLUMN lead_manager_id UUID REFERENCES lead_managers(id);

CREATE INDEX idx_campaigns_lead_manager_id ON campaigns(lead_manager_id);

-- Add trigger for modified timestamp
CREATE TRIGGER update_lead_managers_modified
  BEFORE UPDATE ON lead_managers
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
```

**Backend Changes**:
1. Create leadManagerTypes.ts:
   - LeadManager, LeadManagerCreateDTO, LeadManagerUpdateDTO, LeadManagerFilters
2. Create leadManagerDAO.ts:
   - Full CRUD operations
   - getActive() - returns only active managers
   - Soft-delete enforcement
3. Create leadManagerService.ts:
   - Business logic wrapper around DAO
   - Validation (name required, email format)
4. Create leadManagerResource.ts:
   - GET /api/lead-managers (list all)
   - GET /api/lead-managers/:id (get one)
   - POST /api/lead-managers (create)
   - PUT /api/lead-managers/:id (update)
   - DELETE /api/lead-managers/:id (soft delete)
5. Update CampaignType to include `lead_manager_id?: string`
6. Update CampaignDAO:
   - Include lead_manager_id in create/update
   - Add join in getMany() to include manager name
7. Update campaignService:
   - Validate lead_manager_id exists before saving
8. Register leadManagerResource in AutomatorServer.ts

**Frontend Changes**:
1. Create adminLeadManagersSection/:
   - LeadManagersTable (MUI DataGrid)
   - Columns: Name, Email, Phone, Active, # Campaigns, Actions
   - Create/Edit/Delete actions
2. Create AdminLeadManagersView.tsx (wrapper)
3. Add route to AdminRoutes: `/a/lead-managers`
4. Add "Lead Managers" to NavBar (between Sources and Campaigns)
5. Update CampaignForm:
   - Add "Lead Manager" dropdown (below Source dropdown)
   - Fetch active managers for dropdown
   - Make nullable (campaigns can exist without manager initially)
6. Update CampaignsTable:
   - Add "Manager" column showing manager name
   - Filter by manager (optional enhancement)

**Acceptance Criteria**:
- [ ] lead_managers table created with all fields
- [ ] campaigns.lead_manager_id column added (nullable FK)
- [ ] Backend CRUD operations work for managers
- [ ] Admin UI shows managers table
- [ ] Can create/edit/delete managers via UI
- [ ] Campaign form shows manager dropdown
- [ ] Can assign manager to campaign (or leave unassigned)
- [ ] Campaigns table displays manager name
- [ ] Soft-delete works (deleted managers hidden but campaigns retain reference)

**Migration Notes**:
- Existing campaigns will have `lead_manager_id = NULL` (backward compatible)
- Managers can be assigned gradually
- No data loss or breaking changes

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_create_lead_managers_table.sql`
- Backend: `server/src/main/types/leadManagerTypes.ts`, `server/src/main/data/leadManagerDAO.ts`, `server/src/main/services/leadManagerService.ts`, `server/src/main/resources/leadManagerResource.ts`, updates to campaign files
- Frontend: `client/src/components/admin/adminLeadManagersSection/`, `client/src/views/adminViews/AdminLeadManagersView.tsx`, updates to campaign form and table

**Testing**:
1. Create 3 test managers via UI
2. Assign managers to existing campaigns
3. Create new campaign with manager selected
4. Verify campaigns table shows manager names
5. Delete manager → verify campaigns still work (manager name shows as deleted)
6. Verify campaign can be created without manager (nullable FK)

**Dependencies**:
- None (self-contained feature)
- Prerequisite for TICKET-056 (Enhanced Reporting by manager)

**Notes**:
- Mirrors Northstar implementation (validated pattern)
- Enables dual-axis reporting (source + manager)
- Foundation for manager performance tracking
- Simple schema, low risk

---

## Sprint 8: User Features (Tickets #51-53)

### TICKET-051: Implement user activity tracking for accountability
**Type**: Full Stack Feature
**Priority**: P1 (High)
**Estimate**: 6 hours
**Sprint**: 8 (Foundation)
**Date Created**: 2026-03-06
**Status**: ✅ COMPLETE — PR #10 merged to develop (2026-03-12)

**Background**:
VAs and managers need visibility into who is actually working (verifying leads, updating data). Currently, there's no tracking of which user performed which actions.

**Reference**: Use Northstar as the model for this system. Northstar has activity tracking for both leads and buyers — the data model, UI patterns, and feed structure there are a proven example to follow. Copy that approach rather than designing from scratch.

**Goal**:
Track everything. Every action that touches a lead or a system entity should be logged. No exceptions.

**Actions Tracked** (implemented):

Lead lifecycle:
1. `lead_imported` — batch event: N leads imported via CSV (user) or API (source name)
2. `lead_verified` — lead marked verified (who + when)
3. `lead_unverified` — lead unmarked verified (who)
4. `lead_updated` — lead fields edited (who)
5. `lead_trashed` — lead deleted (who + reason); includes worker expiration trashes (source: worker)
6. `lead_sent` — lead dispatched to buyer; covers manual, auto-send on API import, and worker sends (source field distinguishes)

System / admin actions:
7. `worker_enabled` / `worker_disabled` — who turned worker on/off
8. `worker_settings_updated` — settings page changes (who + what fields)
9. `source_created` / `source_updated` — source add/edit (who)
10. `campaign_manager_assigned` — manager assigned to campaign (who)
11. `buyer_created` / `buyer_updated` — buyer add/edit (who)
12. `lead_manager_created` / `lead_manager_updated` — lead manager add/edit (who)
13. `county_updated` — county field edits and blacklist toggle (who)

**Database Changes**:
```sql
-- Migration: add_user_activity_tracking.sql

-- Add verified_by to leads table
ALTER TABLE leads
ADD COLUMN verified_by_user_id UUID REFERENCES users(id);

CREATE INDEX idx_leads_verified_by ON leads(verified_by_user_id) WHERE verified_by_user_id IS NOT NULL;

-- Create activity log table
-- user_id is nullable: NULL means the action was triggered by the system (worker auto-send, CSV import job, etc.)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),       -- NULL = system action
  lead_id UUID REFERENCES leads(id),        -- NULL for non-lead actions (source created, buyer created, etc.)
  entity_type TEXT,                          -- 'lead', 'source', 'campaign', 'buyer' — what was acted on
  entity_id UUID,                            -- ID of the entity acted on (if not a lead)
  action TEXT NOT NULL,                      -- see Actions to Track above
  action_details JSONB,                      -- context: what changed, which buyer, platform, etc.
  created TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_lead_id ON user_activity_log(lead_id);
CREATE INDEX idx_user_activity_action ON user_activity_log(action);
CREATE INDEX idx_user_activity_created ON user_activity_log(created);
```

**Backend Changes**:
1. Create userActivityTypes.ts:
   - UserActivity, ActivityAction enum, ActivityCreateDTO
2. Create userActivityDAO.ts:
   - logActivity(userId, leadId, action, details)
   - getByUserId(userId, filters) - user's activity history
   - getByLeadId(leadId) - lead's activity history
   - getUserStats(userId, dateRange) - count by action type
3. Update LeadService:
   - In verifyLead(), set `verified_by_user_id` and log activity
   - In updateLead(), log activity with changes
   - In trashLead(), log activity
   - In sendLeadToBuyer(), log activity
   - In enableWorker(), log activity
4. Create userActivityResource.ts:
   - GET /api/user-activity/users/:userId (user's activity)
   - GET /api/user-activity/leads/:leadId (lead's activity history)
   - GET /api/user-activity/stats (dashboard stats)
5. Get authenticated user from JWT token (req.user)
6. Register userActivityResource in AutomatorServer.ts

**Frontend Changes**:
1. Create ActivityDashboard component:
   - Table showing all users
   - Columns: User, Leads Verified (Today/Week/Month), Leads Updated, Leads Sent
   - Click user → drill down to activity details
2. Create UserActivityModal:
   - Shows detailed activity log for selected user
   - Filter by date range and action type
3. Add activity section to LeadDetailsModal:
   - "Activity History" tab showing who did what and when
4. Add route to AdminRoutes: `/a/activity` (admin only)
5. Add "Activity" to NavBar (admin only)

**Activity Log Format**:
```json
{
  "user_id": "uuid",
  "lead_id": "uuid",
  "action": "verified",
  "action_details": {
    "previous_status": "unverified",
    "new_status": "verified"
  },
  "created": "2026-03-06T10:30:00Z"
}
```

**Acceptance Criteria**:
- [ ] leads.verified_by_user_id column added
- [ ] user_activity_log table created
- [ ] Lead verification sets verified_by_user_id
- [ ] All tracked actions logged to user_activity_log
- [ ] Activity dashboard shows user stats
- [ ] Can view user's activity history
- [ ] Lead details shows activity history
- [ ] Activity log includes authenticated user (from JWT)

**Privacy/Security**:
- Activity log visible to admins only
- Users can see their own activity
- No deletion of activity records (audit trail)

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_add_user_activity_tracking.sql`
- Backend: `server/src/main/types/userActivityTypes.ts`, `server/src/main/data/userActivityDAO.ts`, `server/src/main/resources/userActivityResource.ts`, updates to leadService.ts
- Frontend: Activity dashboard component, user activity modal, updates to lead details modal

**Testing**:
1. Verify a lead → check verified_by_user_id set
2. Check user_activity_log for verification record
3. Update lead → check activity log for update record
4. View activity dashboard → verify stats are accurate
5. Test date range filters
6. Test drill-down to user activity details

**Dependencies**:
- User authentication (JWT token provides user ID)

**Notes**:
- Simple implementation (just tracking, no complex analytics)
- Focus on accountability, not micromanagement
- Activity log could grow large over time (consider archival strategy in future)

---

### TICKET-052: Implement call queue for leads needing phone follow-up
**Type**: Full Stack Feature
**Priority**: P1 (Medium)
**Estimate**: 6 hours
**Sprint**: 9 (Core Features)
**Date Created**: 2026-03-06

**Background**:
During lead verification, VAs sometimes find issues that require phone follow-up (wrong phone number, missing information). These leads need to go into a separate call queue for another VA to contact the property owner and collect correct information.

**Different from "Needs Review"**:
- **Needs Review:** Import-time errors (bad county, invalid state) - pre-verification
- **Call Queue:** Post-verification issues (wrong phone, missing info) - requires human intervention

**Flow**:
1. VA verifies lead, finds issue
2. VA marks lead "Needs Call" with reason
3. Lead appears in Call Queue view
4. Another VA picks up lead from queue
5. VA calls property owner, updates lead data
6. VA marks "Call Complete"
7. Lead returns to normal workflow (ready for buyer dispatch)

**Database Changes**:
```sql
-- Migration: add_call_queue_fields.sql
ALTER TABLE leads
ADD COLUMN needs_call BOOLEAN DEFAULT false,
ADD COLUMN call_reason TEXT,
ADD COLUMN call_attempts INTEGER DEFAULT 0,
ADD COLUMN last_call_attempt TIMESTAMPTZ;

CREATE INDEX idx_leads_needs_call ON leads(needs_call) WHERE needs_call = true AND deleted IS NULL;
```

**Backend Changes**:
1. Update LeadType to include:
   - `needs_call: boolean`
   - `call_reason?: string`
   - `call_attempts: number`
   - `last_call_attempt?: Date`
2. Update leadDAO:
   - Add getCallQueue(filters) - returns leads where needs_call=true
   - Add markNeedsCall(leadId, reason)
   - Add recordCallAttempt(leadId) - increments call_attempts
   - Add markCallComplete(leadId) - sets needs_call=false
3. Update leadService:
   - Business logic for call queue operations
   - Validation (reason required when marking needs call)
4. Update leadResource:
   - POST /api/leads/:id/mark-needs-call (body: {reason})
   - POST /api/leads/:id/record-call-attempt
   - POST /api/leads/:id/mark-call-complete
   - GET /api/leads/call-queue (returns filtered list)

**Frontend Changes**:
1. Create CallQueueView:
   - Table showing all leads with needs_call=true
   - Columns: Name, County, State, Call Reason, Attempts, Last Attempt, Actions
   - Sort by last_call_attempt (oldest first)
   - Action buttons: "Record Attempt", "Mark Complete"
2. Add route to AdminRoutes: `/a/call-queue`
3. Add "Call Queue" to NavBar (between Leads and Buyers)
4. Update LeadDetailsModal:
   - Add "Mark Needs Call" button
   - Modal with reason dropdown/textarea
   - Show call history (attempts, reason)
5. Call reason dropdown options:
   - Wrong Phone Number
   - Phone Disconnected
   - Missing Information
   - Needs Clarification
   - Other (with text field)

**Acceptance Criteria**:
- [ ] Leads table has call queue fields
- [ ] Can mark lead "Needs Call" with reason
- [ ] Call queue view shows all leads needing calls
- [ ] Can record call attempts (increments counter)
- [ ] Can mark call complete (removes from queue)
- [ ] Call history visible in lead details
- [ ] Call queue sorted by oldest attempt first

**Worker Behavior**:
- Worker should skip leads with needs_call=true (not eligible for automated sends)
- After call complete, lead returns to worker eligibility

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_add_call_queue_fields.sql`
- Backend: `server/src/main/types/leadTypes.ts`, `server/src/main/data/leadDAO.ts`, `server/src/main/services/leadService.ts`, `server/src/main/resources/leadResource.ts`
- Frontend: Call queue view, updates to lead details modal, navbar

**Testing**:
1. Mark lead "Needs Call" with reason
2. Verify appears in call queue view
3. Record call attempt → verify counter increments
4. Mark call complete → verify removed from queue
5. Verify worker skips leads with needs_call=true
6. Test with multiple leads in queue

**Dependencies**:
- None (self-contained feature)

**Notes**:
- Simple boolean flag + queue view
- Low complexity, high operational value
- Improves verification workflow

---

### TICKET-053: Implement trash reasons master table for analytics
**Type**: Full Stack Feature
**Priority**: P1 (Medium)
**Estimate**: 4 hours
**Sprint**: 8 (Foundation)
**Date Created**: 2026-03-06

**Background**:
Currently, leads can be trashed but there's no structured tracking of WHY they were trashed. A master table of trash reasons enables analytics on rejection patterns (e.g., "50% trashed due to mobile homes").

**Common Trash Reasons**:
- Mobile Home / Parking Lot
- Owner Occupied (not investor property)
- Apartment Rental
- Duplicate Lead
- Bad Data / Invalid Information
- Does Not Meet Buyer Criteria
- Other (with free-form text field)

**Database Changes**:
```sql
-- Migration: create_trash_reasons_table.sql
CREATE TABLE trash_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created TIMESTAMPTZ DEFAULT NOW(),
  modified TIMESTAMPTZ DEFAULT NOW(),
  deleted TIMESTAMPTZ
);

CREATE INDEX idx_trash_reasons_active ON trash_reasons(active) WHERE active = true AND deleted IS NULL;
CREATE INDEX idx_trash_reasons_display_order ON trash_reasons(display_order);

-- Seed initial reasons
INSERT INTO trash_reasons (reason_text, display_order) VALUES
  ('Mobile Home / Parking Lot', 1),
  ('Owner Occupied', 2),
  ('Apartment Rental', 3),
  ('Duplicate Lead', 4),
  ('Bad Data / Invalid', 5),
  ('Does Not Meet Criteria', 6),
  ('Other', 99);

ALTER TABLE leads
ADD COLUMN trash_reason_id UUID REFERENCES trash_reasons(id),
ADD COLUMN trash_reason_notes TEXT; -- free-form for "Other"

CREATE INDEX idx_leads_trash_reason_id ON leads(trash_reason_id) WHERE trash_reason_id IS NOT NULL;

-- Trigger for modified timestamp
CREATE TRIGGER update_trash_reasons_modified
  BEFORE UPDATE ON trash_reasons
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
```

**Backend Changes**:
1. Create trashReasonTypes.ts:
   - TrashReason, TrashReasonCreateDTO, TrashReasonUpdateDTO
2. Create trashReasonDAO.ts:
   - Full CRUD operations
   - getActive() - returns only active reasons sorted by display_order
3. Create trashReasonService.ts:
   - Business logic wrapper
   - Validation (reason_text required)
4. Create trashReasonResource.ts:
   - GET /api/trash-reasons (list all active)
   - GET /api/trash-reasons/:id (get one)
   - POST /api/trash-reasons (create - admin only)
   - PUT /api/trash-reasons/:id (update - admin only)
   - DELETE /api/trash-reasons/:id (soft delete - admin only)
5. Update LeadType to include:
   - `trash_reason_id?: string`
   - `trash_reason_notes?: string`
6. Update leadDAO.trashLead() to accept trash_reason_id and notes
7. Update leadService.trashLead() to accept and validate reason
8. Register trashReasonResource in AutomatorServer.ts

**Frontend Changes**:
1. Create adminTrashReasonsSection/:
   - TrashReasonsTable (MUI DataGrid)
   - Columns: Reason, Active, Display Order, Actions
   - Create/Edit/Delete actions
   - Reorder functionality (drag-and-drop or up/down arrows)
2. Create AdminTrashReasonsView.tsx (wrapper)
3. Add route to AdminRoutes: `/a/trash-reasons` (admin only)
4. Update lead trash action:
   - Show dropdown with active reasons
   - If "Other" selected, show text field for notes
   - Reason required (cannot trash without selecting reason)
5. Update lead details modal:
   - Show trash reason in lead history
   - Show trash_reason_notes if present
6. Create trash reasons analytics view (optional):
   - Chart showing breakdown by reason
   - Date range filter

**Trash Action UI Flow**:
1. User clicks trash icon
2. Modal opens with:
   - Dropdown: "Reason for trashing" (required)
   - If "Other" selected: Text field "Additional notes"
   - Buttons: "Cancel", "Trash Lead"
3. Submit → lead trashed with reason

**Acceptance Criteria**:
- [ ] trash_reasons table created with seed data
- [ ] leads.trash_reason_id column added
- [ ] Admin UI for managing trash reasons (CRUD)
- [ ] Trash action shows reason dropdown (required)
- [ ] "Other" option shows notes text field
- [ ] Cannot trash lead without selecting reason
- [ ] Lead details shows trash reason
- [ ] Soft-delete works for reasons (deleted reasons hidden but leads retain reference)

**Analytics Queries**:
```sql
-- Trash reasons breakdown
SELECT tr.reason_text, COUNT(l.id) as count
FROM leads l
JOIN trash_reasons tr ON l.trash_reason_id = tr.id
WHERE l.deleted IS NOT NULL
GROUP BY tr.reason_text
ORDER BY count DESC;

-- Trash reasons by date range
SELECT DATE(l.deleted) as date, tr.reason_text, COUNT(l.id)
FROM leads l
JOIN trash_reasons tr ON l.trash_reason_id = tr.id
WHERE l.deleted >= '2026-01-01'
GROUP BY DATE(l.deleted), tr.reason_text;
```

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_create_trash_reasons_table.sql`
- Backend: `server/src/main/types/trashReasonTypes.ts`, `server/src/main/data/trashReasonDAO.ts`, `server/src/main/services/trashReasonService.ts`, `server/src/main/resources/trashReasonResource.ts`, updates to lead trash logic
- Frontend: `client/src/components/admin/adminTrashReasonsSection/`, trash action modal, lead details updates

**Testing**:
1. Create trash reason via admin UI
2. Trash lead with reason selected
3. Verify lead has trash_reason_id set
4. Select "Other" → verify notes field appears and saves
5. Delete trash reason → verify leads still show deleted reason text
6. Verify cannot trash lead without selecting reason

**Dependencies**:
- None (self-contained feature)

**Notes**:
- Simple master table pattern (similar to counties, buyers)
- Low complexity, high analytics value
- Quick win for Sprint 8

---

## Sprint 10: Advanced Features (Tickets #54-56)

### TICKET-054: Expand disputes system with reasons and resolution workflow
**Type**: Full Stack Feature
**Priority**: P1 (Medium)
**Estimate**: 12 hours
**Sprint**: 10 (Advanced Features)
**Date Created**: 2026-03-06
**Related**: Expands TICKET-042 (basic disputes)

**Background**:
TICKET-042 provided basic dispute tracking. This ticket expands it with structured reasons, resolution workflow, and comprehensive analytics.

**Use Case**:
1. VA checks buyer platform (Compass, Sellers) → sees lead was disputed
2. VA logs dispute in system with structured reason
3. Manager reviews dispute
4. Manager marks dispute resolved with notes
5. System tracks dispute trends and buyer dispute rates

**Database Changes**:
```sql
-- Migration: expand_disputes_system.sql

-- Create dispute reasons master table
CREATE TABLE dispute_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created TIMESTAMPTZ DEFAULT NOW(),
  modified TIMESTAMPTZ DEFAULT NOW(),
  deleted TIMESTAMPTZ
);

CREATE INDEX idx_dispute_reasons_active ON dispute_reasons(active) WHERE active = true AND deleted IS NULL;

-- Seed initial reasons
INSERT INTO dispute_reasons (reason_text, display_order) VALUES
  ('Wrong Lead (Does Not Match Ad)', 1),
  ('Bad Data (Phone/Address Invalid)', 2),
  ('Duplicate Lead', 3),
  ('Not Qualified for Buyer', 4),
  ('Buyer Remorse / Cancellation', 5),
  ('Other', 99);

-- Create disputes table
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  dispute_reason_id UUID REFERENCES dispute_reasons(id),
  dispute_details TEXT, -- free-form notes
  created_by_user_id UUID REFERENCES users(id),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES users(id),
  resolution_notes TEXT,
  created TIMESTAMPTZ DEFAULT NOW(),
  modified TIMESTAMPTZ DEFAULT NOW(),
  deleted TIMESTAMPTZ
);

CREATE INDEX idx_disputes_lead_id ON disputes(lead_id);
CREATE INDEX idx_disputes_buyer_id ON disputes(buyer_id);
CREATE INDEX idx_disputes_resolved ON disputes(resolved);
CREATE INDEX idx_disputes_created ON disputes(created);

-- Triggers
CREATE TRIGGER update_dispute_reasons_modified
  BEFORE UPDATE ON dispute_reasons
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_disputes_modified
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
```

**Backend Changes**:
1. Create disputeTypes.ts:
   - Dispute, DisputeReason, DisputeCreateDTO, DisputeResolveDTO
2. Create disputeReasonDAO.ts:
   - Full CRUD operations
   - getActive() - returns active reasons sorted by display_order
3. Create disputeDAO.ts:
   - create(disputeData)
   - getById(id)
   - getByLeadId(leadId) - all disputes for lead
   - getByBuyerId(buyerId) - all disputes for buyer
   - resolve(disputeId, userId, notes)
   - getDisputeStats(filters) - analytics queries
4. Create disputeService.ts:
   - Business logic for creating and resolving disputes
   - Validation (reason required, buyer must have received lead)
5. Create disputeResource.ts:
   - GET /api/disputes (list all, with filters)
   - POST /api/disputes (create dispute)
   - GET /api/disputes/:id (get one)
   - PUT /api/disputes/:id/resolve (mark resolved)
   - GET /api/disputes/stats (analytics)
6. Create disputeReasonResource.ts:
   - GET /api/dispute-reasons (list active)
   - POST /api/dispute-reasons (create - admin)
   - PUT /api/dispute-reasons/:id (update - admin)
   - DELETE /api/dispute-reasons/:id (soft delete - admin)
7. Register resources in AutomatorServer.ts

**Frontend Changes**:
1. Create adminDisputeReasonsSection/:
   - Admin UI for managing dispute reasons (CRUD)
   - Similar to trash reasons UI
2. Update BuyerSendModal:
   - Add "Dispute" button next to "Sold" status
   - Opens dispute creation modal
3. Create DisputeCreateModal:
   - Pre-filled: Lead name, Buyer name (read-only)
   - Dropdown: Dispute reason (required)
   - If "Other": Text field for details
   - Textarea: Additional notes
   - Submit button
4. Create DisputesView:
   - Table showing all disputes
   - Columns: Lead, Buyer, Reason, Created By, Status, Created Date, Actions
   - Filter by: Buyer, Status (Open/Resolved), Date Range
   - Click row → see dispute details
   - Action: "Resolve" button (if unresolved)
5. Create DisputeResolveModal:
   - Shows dispute details
   - Textarea: Resolution notes (required)
   - Submit button → marks resolved
6. Create DisputeAnalytics dashboard:
   - Dispute rate per buyer (chart)
   - Most common dispute reasons (pie chart)
   - Dispute trends over time (line chart)
   - Date range filter
7. Update lead history:
   - Show dispute badge if lead has disputes
   - Click badge → see dispute details
8. Add route to AdminRoutes: `/a/disputes`
9. Add "Disputes" to NavBar (admin only)

**Dispute Analytics Queries**:
```sql
-- Dispute rate per buyer
SELECT
  b.name,
  COUNT(d.id) as total_disputes,
  COUNT(DISTINCT sl.lead_id) as total_sends,
  ROUND(COUNT(d.id)::NUMERIC / NULLIF(COUNT(DISTINCT sl.lead_id), 0) * 100, 2) as dispute_rate_pct
FROM buyers b
LEFT JOIN send_log sl ON b.id = sl.buyer_id AND sl.status = 'sent'
LEFT JOIN disputes d ON b.id = d.buyer_id
GROUP BY b.name
ORDER BY dispute_rate_pct DESC;

-- Most common dispute reasons
SELECT dr.reason_text, COUNT(d.id) as count
FROM disputes d
JOIN dispute_reasons dr ON d.dispute_reason_id = dr.id
GROUP BY dr.reason_text
ORDER BY count DESC;
```

**Acceptance Criteria**:
- [ ] dispute_reasons and disputes tables created
- [ ] Admin UI for managing dispute reasons
- [ ] Can create dispute from buyer send modal
- [ ] Dispute creation requires reason selection
- [ ] Disputes view shows all disputes with filters
- [ ] Can resolve disputes with notes
- [ ] Lead history shows dispute status
- [ ] Dispute analytics dashboard shows key metrics
- [ ] Can track dispute trends over time

**Resolution Workflow**:
1. VA creates dispute (status: unresolved)
2. Manager reviews in disputes view
3. Manager clicks "Resolve"
4. Manager enters resolution notes
5. Dispute marked resolved (resolved_at = NOW(), resolved_by_user_id = manager)

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_expand_disputes_system.sql`
- Backend: dispute types, DAOs, services, resources (8 files)
- Frontend: dispute reasons admin, dispute creation modal, disputes view, analytics dashboard (6+ components)

**Testing**:
1. Create dispute reason via admin UI
2. Mark lead sold to buyer
3. Create dispute with reason
4. Verify dispute appears in disputes view
5. Resolve dispute with notes
6. Verify appears as resolved
7. View analytics → verify charts show data
8. Test multiple disputes for same lead/buyer

**Dependencies**:
- User authentication (tracks who created/resolved)
- Send_log data (disputes link to sent leads)

**Notes**:
- Expands basic TICKET-042 with full workflow
- High analytics value for quality control
- Helps identify problem sources and buyers

---

### TICKET-055: Implement configurable delay before worker processing
**Type**: Backend Feature
**Priority**: P2 (Medium)
**Estimate**: 4 hours
**Sprint**: 9 (Core Features)
**Date Created**: 2026-03-06

**Background**:
Currently, leads become eligible for worker processing immediately after verification. A configurable delay gives VAs time to manually send leads to top-tier buyers before automation kicks in.

**Use Case**:
1. Lead imported at 9:00 AM
2. VA verifies lead at 9:30 AM
3. VA manually sends to Compass, Sellers, Pickle (9:30-10:00 AM)
4. **Delay prevents worker from processing until 12:00 PM (2.5 hours after verification)**
5. At 12:00 PM, if lead not sold, worker starts sending to automated buyers

**Natural Delay Already Exists**:
- VAs must verify leads before enabling worker
- This ticket adds explicit configurable delay on top of verification

**Database Changes**:
```sql
-- Migration: create_system_settings_table.sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL, -- 'integer', 'boolean', 'text', 'json'
  description TEXT,
  created TIMESTAMPTZ DEFAULT NOW(),
  modified TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Insert default delay setting
INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES ('worker_delay_hours', '2', 'integer', 'Hours to wait after lead verification before worker can process lead');

-- Trigger
CREATE TRIGGER update_system_settings_modified
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
```

**Backend Changes**:
1. Create systemSettingsTypes.ts:
   - SystemSetting, SettingType enum, SettingUpdateDTO
2. Create systemSettingsDAO.ts:
   - getByKey(key) - returns setting value
   - update(key, value) - updates setting
   - getAll() - returns all settings
3. Create systemSettingsService.ts:
   - getSetting(key) - with type casting
   - updateSetting(key, value) - with validation
4. Create systemSettingsResource.ts:
   - GET /api/system-settings (list all - admin only)
   - PUT /api/system-settings/:key (update - admin only)
5. Update WorkerService:
   - In processAllBuyers(), check delay before processing each lead
   - Calculate: `lead.verified_at + delay_hours`
   - Only process if `NOW() >= lead.verified_at + INTERVAL 'X hours'`
   - Log skipped leads (not eligible yet)
6. Update BuyerDispatchService:
   - Add getEligibleLeadsForBuyer() - filters by delay
   - Helper: isLeadEligibleForWorker(lead) - checks delay
7. Register systemSettingsResource in AutomatorServer.ts

**Worker Logic Change**:
```typescript
const delaySetting = await this.settingsService.getSetting('worker_delay_hours');
const delayHours = parseInt(delaySetting.setting_value, 10);

for (const lead of leads) {
  const eligibleAt = new Date(lead.verified_at);
  eligibleAt.setHours(eligibleAt.getHours() + delayHours);

  if (new Date() < eligibleAt) {
    logger.debug(`Lead ${lead.id} not eligible until ${eligibleAt}`);
    continue; // Skip this lead
  }

  // Process lead...
}
```

**Frontend Changes**:
1. Create SystemSettingsView (admin only):
   - Table showing all settings
   - Columns: Setting, Value, Type, Description, Actions
   - Edit action opens modal
2. Create SettingEditModal:
   - Field type based on setting_type (number input for integer, checkbox for boolean)
   - Validation based on type
3. Add route to AdminRoutes: `/a/settings` (admin only)
4. Add "Settings" to NavBar dropdown (admin only)
5. Update lead details modal:
   - Show "Worker Eligible At" timestamp
   - Calculate: verified_at + delay_hours
   - Display as countdown if not eligible yet ("Eligible in 1h 23m")

**Acceptance Criteria**:
- [ ] system_settings table created with worker_delay_hours default
- [ ] Worker respects delay (doesn't process leads until delay expires)
- [ ] Admin can update delay setting via UI
- [ ] Lead details shows "Worker Eligible At" timestamp
- [ ] Delay applies to all worker buyers consistently
- [ ] Setting value validated (must be >= 0)

**Edge Cases**:
- **Delay = 0:** Worker processes immediately after verification
- **Lead not verified:** Worker never processes (worker_enabled must be true)
- **Lead verified but worker_enabled=false:** Delay doesn't matter, won't be processed

**Testing**:
1. Set delay to 0.1 hours (6 minutes)
2. Verify lead at 10:00 AM
3. Check worker logs at 10:05 AM → should skip lead
4. Check worker logs at 10:07 AM → should process lead
5. Update delay to 2 hours via settings UI
6. Verify new delay applied to subsequent leads

**Files**:
- Migration: `postgres/migrations/YYYYMMDD_create_system_settings_table.sql`
- Backend: `server/src/main/types/systemSettingsTypes.ts`, `server/src/main/data/systemSettingsDAO.ts`, `server/src/main/services/systemSettingsService.ts`, `server/src/main/resources/systemSettingsResource.ts`, updates to worker logic
- Frontend: System settings view, setting edit modal, lead details updates

**Dependencies**:
- None (self-contained feature)

**Notes**:
- Optional enhancement (natural delay already exists)
- Simple implementation (just time comparison)
- Low risk, low complexity

---

### TICKET-056: Implement enhanced reporting dashboard with charts
**Type**: Full Stack Feature
**Priority**: P1 (High)
**Estimate**: 16 hours
**Sprint**: 10 (Advanced Features)
**Date Created**: 2026-03-06
**Dependencies**: TICKET-050 (Lead Manager System)

**Background**:
Current system has basic lead tables but no comprehensive analytics. Need dashboard with charts showing lead utilization by source, manager, campaign, and buyer performance.

**Report Types**:

#### 1. Lead Utilization by Source
- Total leads received per source
- % verified
- % sent to buyers
- % sold
- Average time to sale
- Revenue per source (if tracking)

#### 2. Lead Utilization by Manager
- Total leads under manager's campaigns
- Manager performance metrics
- Conversion rates
- Manager compensation data

#### 3. Lead Utilization by Campaign
- Individual campaign performance
- ROI per campaign
- Best/worst performing campaigns
- Lead volume trends

#### 4. Buyer Performance
- Total leads sent per buyer
- Acceptance rate
- Dispute rate
- Average response time
- Revenue per buyer

**Database Changes**:
No new tables needed. All queries use existing data:
- leads (with source_id, campaign_id)
- campaigns (with source_id, lead_manager_id)
- send_log (with buyer_id, status)
- disputes (for dispute rates)
- lead_buyer_outcomes (for sold status)

**Backend Changes**:
1. Create reportingTypes.ts:
   - SourceReport, ManagerReport, CampaignReport, BuyerReport
   - ReportFilters (date ranges, status filters)
2. Create reportingService.ts:
   - getSourceUtilization(filters) - aggregates leads by source
   - getManagerUtilization(filters) - aggregates leads by manager
   - getCampaignUtilization(filters) - aggregates leads by campaign
   - getBuyerPerformance(filters) - buyer metrics
   - getLeadFunnel() - conversion funnel data
3. Create reportingResource.ts:
   - GET /api/reports/sources (source utilization)
   - GET /api/reports/managers (manager performance)
   - GET /api/reports/campaigns (campaign performance)
   - GET /api/reports/buyers (buyer performance)
   - GET /api/reports/funnel (conversion funnel)
   - All endpoints support date range and filters
4. Register reportingResource in AutomatorServer.ts

**Example SQL Query (Source Utilization)**:
```sql
SELECT
  s.name as source_name,
  COUNT(l.id) as total_leads,
  COUNT(l.id) FILTER (WHERE l.verified = true) as verified_count,
  COUNT(DISTINCT sl.lead_id) as sent_count,
  COUNT(DISTINCT lbo.lead_id) as sold_count,
  ROUND(COUNT(l.id) FILTER (WHERE l.verified = true)::NUMERIC / NULLIF(COUNT(l.id), 0) * 100, 2) as verified_pct,
  ROUND(COUNT(DISTINCT sl.lead_id)::NUMERIC / NULLIF(COUNT(l.id), 0) * 100, 2) as sent_pct,
  ROUND(COUNT(DISTINCT lbo.lead_id)::NUMERIC / NULLIF(COUNT(l.id), 0) * 100, 2) as sold_pct
FROM sources s
LEFT JOIN campaigns c ON s.id = c.source_id
LEFT JOIN leads l ON c.id = l.campaign_id AND l.deleted IS NULL
LEFT JOIN send_log sl ON l.id = sl.lead_id AND sl.status = 'sent'
LEFT JOIN lead_buyer_outcomes lbo ON l.id = lbo.lead_id
WHERE s.deleted IS NULL
  AND l.created >= $1 -- date range filter
  AND l.created <= $2
GROUP BY s.id, s.name
ORDER BY total_leads DESC;
```

**Frontend Changes**:
1. Create ReportingDashboard/:
   - Dashboard layout with tabs:
     - Overview (summary metrics)
     - Sources
     - Managers
     - Campaigns
     - Buyers
2. Create OverviewTab:
   - Key metrics cards (total leads, verified %, sent %, sold %)
   - Conversion funnel chart (leads → verified → sent → sold)
   - Recent activity table
3. Create SourcesTab:
   - Table: Source name, Total Leads, Verified %, Sent %, Sold %
   - Bar chart: Lead volume by source
   - Line chart: Lead trends over time per source
4. Create ManagersTab:
   - Table: Manager name, Total Leads, Performance Metrics
   - Bar chart: Lead volume by manager
   - Manager comparison chart
5. Create CampaignsTab:
   - Table: Campaign name, Source, Manager, Total Leads, ROI
   - Filter by source/manager
   - Drill-down to campaign details
6. Create BuyersTab:
   - Table: Buyer name, Total Sent, Acceptance Rate, Dispute Rate
   - Bar chart: Send volume by buyer
   - Line chart: Buyer performance over time
7. Add date range picker (applies to all tabs)
8. Add export to CSV button (per tab)
9. Add route to AdminRoutes: `/a/reports` (admin only)
10. Add "Reports" to NavBar (between Leads and Buyers)

**Charts Library**:
Use Recharts or Chart.js for visualizations:
- Bar charts for volume comparisons
- Line charts for trends over time
- Pie charts for breakdowns
- Funnel chart for conversion flow

**Acceptance Criteria**:
- [ ] Reporting endpoints return correct aggregated data
- [ ] Dashboard shows all tabs (Overview, Sources, Managers, Campaigns, Buyers)
- [ ] Date range filter works across all tabs
- [ ] Charts render correctly with real data
- [ ] Can drill down from summary to details
- [ ] Export to CSV works for each report
- [ ] Mobile responsive (charts scale properly)

**Performance Considerations**:
- Complex aggregation queries → consider materialized views or caching
- Date range limits (max 1 year?)
- Pagination for large result sets

**Files**:
- Backend: `server/src/main/types/reportingTypes.ts`, `server/src/main/services/reportingService.ts`, `server/src/main/resources/reportingResource.ts`
- Frontend: `client/src/components/reporting/` (dashboard, tabs, charts), `client/src/views/reportingViews/ReportingView.tsx`

**Testing**:
1. Create test data (multiple sources, managers, campaigns, buyers)
2. Generate leads across different campaigns
3. Verify leads, send to buyers, mark some sold
4. View reports → verify numbers are accurate
5. Test date range filters
6. Test export to CSV
7. Test drill-down navigation

**Dependencies**:
- TICKET-050 (Lead Manager System) - manager reports require lead_managers table

**Notes**:
- High business value (data-driven decisions)
- Complex implementation (multiple queries, charts)
- Phase 3 feature (after foundation in place)

---

**Status**: 🟢 Sprint 1-7 COMPLETE | 🟡 Sprint 8+ NEW (Brainstorming Features)

**Last Updated**: 2026-03-06

**Progress**: 47/56 tickets (Original 41 + QA fixes + Sprint 7 + New 9)
- Completed: 41 core tickets + TICKET-046, TICKET-047
- New: TICKET-048 through TICKET-056 (9 tickets)

---

## Ticket Summary (Updated)

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

---

### New Features (Post-Brainstorming Session 2026-03-06)

| Sprint | Tickets | Total Hours | Risk Level | Status |
|--------|---------|-------------|------------|--------|
| **Sprint 8 (Foundation)** | #048, 050, 051, 053, 057 | ~36 hours | Low | 🟡 IN PROGRESS — 3/5 done |
| **Sprint 9 (Core Features)** | #052, 055 | 10 hours | Low | 🔲 PLANNED |
| **Sprint 10 (Advanced)** | #049, 054, 056 | 44 hours | Medium | 🔲 PLANNED |
| **NEW TOTAL** | **10** | **~90 hours** | - | **3 Complete** |

**New Features Timeline** (Sprints 8-10):
- Developer Days: ~10-11 days (8-hour days)
- Calendar Time: 10-12 weeks (with testing, buffer)
- Estimated Completion: May-June 2026
- Status: 🔲 Awaiting user review and approval

**New Features by Priority**:
- **P0 Foundation:** TICKET-050 (8 hrs) - Lead Manager System
- **P1 High:** TICKET-048, 049, 051, 052, 053, 054, 056 (68 hrs)
- **P2 Medium:** TICKET-055 (4 hrs) - Configurable Delays

**Recommended Sprint Order**:
1. **Sprint 8:** Foundation features (TICKET-050, 051, 053) - 18 hours - Quick wins
2. **Sprint 9:** Core enhancements (TICKET-048, 052, 055) - 22 hours - Medium complexity
3. **Sprint 10:** Advanced features (TICKET-049, 054, 056) - 44 hours - Complex implementations

**Dependencies**:
- TICKET-050 → TICKET-056 (manager system needed for reporting)
- TICKET-048 → TICKET-049 (standard ping needed before auction)

---

---

### TICKET-057: User roles, permissions, and user management UI
**Type**: Full-stack
**Priority**: P0
**Status**: ✅ COMPLETE — PR #11

**Summary**:
Implemented a full per-user, DB-stored permissions system with role-based defaults and a user management UI.

**What was built**:
- `user_permissions` table (migration `20260312000001`)
- Per-entity permission enums: `LeadPermission`, `WorkerPermission`, `SourcePermission`, `BuyerPermission`, `ManagerPermission`, `SettingsPermission`, `UserPermission`, `ActivityPermission`
- `requirePermission()` middleware guards all sensitive routes
- `UserService`: `getAllUsers()`, `updateUserRole()`, `setUserPermissions()`
- `UserResource`: `GET /admin/users`, `PATCH /admin/users/:id/role`, `PUT /admin/users/:id/permissions`, `GET /admin/permissions`
- Activity logging: `UserAction.ROLE_CHANGED`, `UserAction.PERMISSIONS_CHANGED`
- Client: `usePermissions()` hook, `Permission` enum, `AdminUsersSection` table with inline role dropdown + permissions editor dialog
- `ActivityPermission.VIEW` gates all activity endpoints

**Files affected**:
- `postgres/migrations/20260312000001.do._add-user-permissions-table.sql`
- `server/src/main/types/permissionTypes.ts` (new)
- `server/src/main/middleware/requirePermission.ts` (new)
- `server/src/main/data/userDAO.ts`
- `server/src/main/services/userService.ts`
- `server/src/main/resources/userResource.ts`
- `server/src/main/resources/activityResource.ts`, `leadResource.ts`, `workerResource.ts`, `settingsResource.ts`, `sourceResource.ts`, `buyerResource.ts`, `leadManagerResource.ts`
- `client/src/types/userTypes.ts`
- `client/src/hooks/usePermissions.ts` (new)
- `client/src/services/user.service.tsx`
- `client/src/components/admin/adminUsersSection/AdminUsersSection.tsx` (new)
- `client/src/views/adminViews/AdminUsersView.tsx` (new)
- `client/src/context/routes/AdminRoutes.tsx`
- `client/src/components/navBar/NavBar.tsx`

---

---

### TICKET-058: Dispute system for sent leads
**Type**: Full Stack Feature
**Priority**: P1
**Estimate**: 8 hours
**Sprint**: 8
**Status**: 🔲 TODO

**Background**:
When a lead is sent to a buyer and the buyer disputes it (bad data, wrong criteria, etc.), we need to record that dispute against the specific send_log entry. Disputes are per-buyer, per-lead, and include a reason + notes.

**Database Changes**:
```sql
CREATE TABLE lead_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_log_id UUID NOT NULL REFERENCES send_log(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  buyer_id UUID NOT NULL REFERENCES buyers(id),
  reason VARCHAR NOT NULL,
  notes TEXT,
  status VARCHAR NOT NULL DEFAULT 'open',  -- open, resolved, rejected
  resolved_at TIMESTAMPTZ,
  created TIMESTAMPTZ DEFAULT NOW(),
  modified TIMESTAMPTZ DEFAULT NOW(),
  deleted TIMESTAMPTZ
);
```

**Backend Changes**:
1. `disputeTypes.ts`: `LeadDispute`, `LeadDisputeCreateDTO`, `LeadDisputeUpdateDTO`
2. `disputeDAO.ts`: create, getByLead, getByBuyer, updateStatus
3. `disputeService.ts`: business logic
4. `disputeResource.ts`:
   - `POST /api/disputes` — create dispute (requires `leads.dispute` permission)
   - `GET /api/disputes?lead_id=` — get disputes for a lead
   - `PATCH /api/disputes/:id/status` — resolve/reject (requires `leads.dispute`)
5. Add `LeadPermission.DISPUTE = 'leads.dispute'` to permission types
6. Seed `leads.dispute` for admin + superadmin

**Frontend Changes**:
1. In send history (lead details / buyer send modal): "Dispute" button next to each send log entry
2. Dispute dialog: reason dropdown + notes text field
3. Show dispute status badge on send log rows that have disputes
4. Permission gate: `can(Permission.LEADS_DISPUTE)` hides the button

**Acceptance Criteria**:
- [ ] Disputes table created
- [ ] Can dispute any send_log entry
- [ ] Dispute shows in lead details send history
- [ ] Dispute status (open/resolved/rejected) tracked
- [ ] Permission-gated

---

### TICKET-059: Dynamic lead payload blob (vertical-specific fields)
**Type**: Full Stack Feature
**Priority**: P1
**Estimate**: 10 hours
**Sprint**: 9
**Status**: 🔲 TODO

**Background**:
Different lead sources send vertical-specific extra data (real estate: bedrooms, bathrooms, sqft, sale timeline; pool companies: pool size, fence type; etc.). This needs to be stored as a dynamic blob per lead, not a fixed schema.

Also needed for Northstar integration — sources should be able to submit a freeform JSON blob alongside the standard lead fields.

**Database Changes**:
```sql
ALTER TABLE leads ADD COLUMN extra_data JSONB;
-- Index for common query patterns
CREATE INDEX idx_leads_extra_data ON leads USING gin(extra_data);
```

**Backend Changes**:
1. Update `Lead` type to include `extra_data?: Record<string, any>`
2. Update `leadDAO` insert/update to persist `extra_data`
3. Update `/api/leads-open` import endpoint to accept and store `extra_data` from the request body
4. Update lead DTOs

**Frontend Changes**:
1. In lead details view: show `extra_data` fields as a collapsible "Extra Fields" section
   - Render as key-value pairs (pretty-print the keys: snake_case → Title Case)
2. No editing in UI — this is source-provided data

**Acceptance Criteria**:
- [ ] `extra_data` stored on leads
- [ ] Import endpoint accepts and stores `extra_data`
- [ ] Lead details shows extra fields if present
- [ ] Does not break existing leads without `extra_data`

---

### TICKET-060: Call queue permission + queue-for-call action
**Type**: Full Stack Feature
**Priority**: P1
**Estimate**: 6 hours
**Sprint**: 8
**Status**: 🔲 TODO

**Background**:
During lead verification, if a verifier determines the lead needs a phone call (e.g., missing county/zip, suspicious data), they should be able to mark it "Queue for Call". This is a separate queue from the worker queue — it means a human needs to call this lead.

**Permission**:
Add `LeadPermission.CALL_QUEUE = 'leads.call_queue'` — only users with this permission can queue a lead for a call.
Seed: user ✅, admin ✅, superadmin ✅ (it's a basic action).

**Database Changes**:
```sql
ALTER TABLE leads ADD COLUMN call_queued BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN call_queued_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN call_queued_by UUID REFERENCES users(id);
```

**Backend Changes**:
1. Add `call_queued`, `call_queued_at`, `call_queued_by` to `Lead` type
2. `leadDAO`: update `queueForCall(leadId, userId)`
3. `leadService`: `queueForCall(leadId, userId)` — sets flag + timestamp
4. `leadResource`: `PATCH /api/leads/:id/queue-call` — requires `LeadPermission.CALL_QUEUE`
5. Activity logging: new `LeadAction.CALL_QUEUED = 'lead_call_queued'`

**Frontend Changes**:
1. In lead verification form / lead details: "Queue for Call" button
2. Permission gate: `can(Permission.LEADS_CALL_QUEUE)`
3. Show "Call Queued" badge on lead if `call_queued=true`
4. In leads table: filter option to show call-queued leads

**Acceptance Criteria**:
- [ ] `call_queued` flag on leads
- [ ] Queue-for-call action works from lead details
- [ ] Permission gated
- [ ] Activity logged
- [ ] Badge visible in lead details and table

---

### Grand Total (All Tickets)

| Category | Tickets | Hours | Completed |
|----------|---------|-------|-----------|
| **Original Refactor** | 47 | ~150 hrs | 38 tickets (81%) |
| **New Features** | 13 | ~120 hrs | 3 tickets (23%) |
| **GRAND TOTAL** | **60** | **~270 hrs** | **41 tickets (68%)** |
