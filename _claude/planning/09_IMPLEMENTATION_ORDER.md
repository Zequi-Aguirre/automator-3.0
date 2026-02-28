# Implementation Order & Sprint Breakdown

## Overview

**Total Duration**: ~10 weeks (8 weeks + 25% buffer)
**Total Tickets**: 38 tickets
**Sprints**: 6 sprints

---

## Sprint 1: Foundation & Admin UI (2 weeks)

**Goal**: Buyers infrastructure exists, admin can manage buyers, no worker changes

**Tickets**: #1-10

### Week 1
- **TICKET-001**: Create buyers table with timing columns + lead_buyer_outcomes table
- **TICKET-002**: Extend send_log with buyer_id + leads with worker_enabled
- **TICKET-003**: Create BuyerDAO with encryption utilities
- **TICKET-004**: Create LeadBuyerOutcomeDAO
- **TICKET-005**: Create buyerTypes.ts and leadBuyerOutcomeTypes.ts

### Week 2
- **TICKET-006**: Update sendLogTypes.ts and leadTypes.ts
- **TICKET-007**: Create BuyerService
- **TICKET-008**: Create BuyerResource (API)
- **TICKET-009**: Create frontend buyerService.ts
- **TICKET-010**: Create admin buyers CRUD UI

**Deliverables**:
- buyers table in DB (with timing columns, no separate schedule table)
- lead_buyer_outcomes table for sold status
- Admin UI for managing buyers
- API endpoints for buyers CRUD

**Success Criteria**:
- [ ] Admin can create/edit/delete buyers
- [ ] Buyers data persists in DB with timing columns
- [ ] lead_buyer_outcomes table created
- [ ] No impact on existing worker

**Deploy Strategy**:
- Deploy to staging first
- Smoke test buyers UI
- Deploy to production (low risk, no worker changes)

---

## Sprint 2: Dispatch Logic & Manual Sends (1.5 weeks)

**Goal**: Manual lead sends to buyers work, vendor abstraction complete, worker control added

**Tickets**: #11-18

### Week 1
- **TICKET-011**: Create BuyerWebhookAdapter with flexible auth
- **TICKET-012**: Extend SendLogDAO for buyer queries
- **TICKET-013**: Create BuyerDispatchService
- **TICKET-014**: Add manual send to buyer API endpoint

### Week 2 (first half)
- **TICKET-015**: Add buyer history and worker control to LeadService
- **TICKET-016**: Add buyer history and worker control API endpoints
- **TICKET-017**: Create buyer send modal UI with sold toggles and worker button
- **TICKET-018**: Add buyers column to leads table and worker button

**Deliverables**:
- BuyerWebhookAdapter for multi-vendor HTTP posting with flexible auth
- Manual send API + UI
- Buyer send history modal with sold toggles
- "Send to Worker" button
- lead_buyer_outcomes for tracking sold status

**Success Criteria**:
- [ ] Admin can manually send lead to any buyer
- [ ] Send results visible in buyer modal
- [ ] Webhook adapter supports custom header names and prefixes
- [ ] Non-production sends to mock endpoint
- [ ] "Send to Worker" button sets worker_enabled=true
- [ ] Sold toggle creates outcome record

**Deploy Strategy**:
- Deploy to staging
- Create test buyers (different auth types)
- Test manual sends to each buyer
- Test worker_enabled toggling
- Verify send_log entries (allows retries)
- Deploy to production

---

## Sprint 3: iSpeedToLead Migration (0.5 weeks)

**Goal**: iSpeedToLead exists as buyer (dispatch_mode='worker'), can be called when worker_enabled=true

**Tickets**: #19-20

- **TICKET-019**: Migration - Add iSpeedToLead as buyer
- **TICKET-020**: Verify iSpeedToLead buyer in UI

**Deliverables**:
- iSpeedToLead buyer record in DB with dispatch_mode='worker'
- Historical send_log entries backfilled
- next_send_at initialized

**Success Criteria**:
- [ ] iSpeedToLead buyer visible in admin UI with dispatch_mode='worker'
- [ ] Manual send blocked (worker buyer only)
- [ ] Webhook called correctly
- [ ] Response logged to send_log

**Deploy Strategy**:
- **CRITICAL**: Test in staging first
- Verify LEAD_VENDOR_URL is correct
- Run migration in production
- Test manual send immediately after migration (should be blocked)
- Monitor logs for errors

---

## Sprint 4: Worker Switchover (2.5 weeks) ⚠️ HIGH RISK

**Goal**: Worker uses buyers instead of investors, only processes worker_enabled leads

**Tickets**: #21-25

### Week 1
- **TICKET-021**: Refactor WorkerService to use buyers with worker gating
- **TICKET-022**: Add per-buyer queue processing to BuyerDispatchService
- **TICKET-023**: Update SendLeadsJob to call processAllBuyers

### Week 2
- **TICKET-024**: Migration - Remove global send timing
- **TICKET-025**: Worker testing - automated buyer sends with worker gating (6 hours)

**Deliverables**:
- WorkerService refactored
- BuyerDispatchService queue processing
- Global timing removed
- Per-buyer scheduling active (buyer.next_send_at)
- Worker gating implemented (worker_enabled flag)

**Success Criteria**:
- [ ] Worker automatically sends leads to worker buyers
- [ ] Worker only processes leads where worker_enabled=true
- [ ] Priority order respected (lower priority number first)
- [ ] Per-buyer timing works (different intervals)
- [ ] buyer.next_send_at updates correctly
- [ ] Business hours enforcement works
- [ ] No duplicate sends
- [ ] allow_resell logic uses lead_buyer_outcomes table

**Deploy Strategy** (CRITICAL):
1. **Staging Deployment**:
   - Deploy code changes
   - Run migration #24 (remove global timing)
   - Enable worker
   - Monitor for 48 hours
   - Test all scenarios:
     - Worker buyers send automatically when worker_enabled=true
     - Worker skips worker_enabled=false leads
     - Single buyer sends
     - Multiple buyers send independently
     - Priority order
     - Business hours
     - allow_resell logic

2. **Production Deployment**:
   - **Disable worker**: `UPDATE worker_settings SET worker_enabled = false;`
   - Deploy code
   - Run migration #24
   - **Test manual sends first** (verify nothing broke)
   - **Enable worker**: `UPDATE worker_settings SET worker_enabled = true;`
   - **Monitor closely for 4 hours**:
     - Check logs for errors
     - Verify sends happening only for worker_enabled=true leads
     - Verify buyer.next_send_at updating
     - Check send_log entries
   - **Rollback plan ready**:
     - If worker fails, disable immediately
     - Revert code deployment
     - Restore deleted columns (migration rollback)
     - Re-deploy old code
     - Re-enable worker with old logic

3. **Week 3 (Stabilization)**:
   - Monitor production for 1 week
   - Fix any bugs found
   - No new features

---

## Sprint 5: Add New Buyers (1 week)

**Goal**: All 6 buyers configured, two-lane dispatch operational (manual + worker)

**Tickets**: #26-31

### Week 1
- **TICKET-026**: Add Compass buyer (priority 1, dispatch_mode='manual')
- **TICKET-027**: Add Sellers buyer (priority 2, dispatch_mode='manual')
- **TICKET-028**: Add Pickle buyer (priority 3, dispatch_mode='manual')
- **TICKET-029**: Add Motivated buyer (priority 4, dispatch_mode='worker')
- **TICKET-030**: Add Andy buyer (priority 5, dispatch_mode='worker')
- **TICKET-031**: End-to-end priority pipeline test

**Deliverables**:
- 6 buyers configured
- Manual buyers: Compass, Sellers, Pickle (dispatch_mode='manual')
- Worker buyers: Motivated, Andy, iSpeedToLead (dispatch_mode='worker')
- Two-lane dispatch tested

**Success Criteria**:
- [ ] All buyers visible in admin UI with correct dispatch_mode
- [ ] Manual send to manual buyers works
- [ ] Manual send to worker buyers blocked
- [ ] Automated sends go in priority order for worker buyers
- [ ] Worker only sends worker_enabled=true leads
- [ ] allow_resell=false stops pipeline when sold (lead_buyer_outcomes)
- [ ] allow_resell=true continues pipeline

**Deploy Strategy**:
- Add buyers via admin UI (no code deployment)
- Test manual send to each manual buyer first
- Test that manual send is blocked for worker buyers
- Enable auto_send for worker buyers one at a time
- Monitor each for 24 hours before enabling next
- Run end-to-end test:
  - Import lead
  - Verify
  - Manual send to Compass, Sellers, Pickle
  - Set worker_enabled=true
  - Watch worker send to Motivated, Andy, iSpeedToLead
  - Verify allow_resell logic with sold toggles

---

## Sprint 6: Cleanup & Deprecation (0.5 weeks)

**Goal**: Remove investors completely, clean codebase

**Tickets**: #32-38

### Week 1
- **TICKET-032**: Mark investors as deprecated in codebase
- **TICKET-033**: Migration - Remove investor references ⚠️ IRREVERSIBLE
- **TICKET-034**: Remove investor code from backend
- **TICKET-035**: Remove investor code from frontend
- **TICKET-036**: Delete iSpeedToLeadIAO.ts
- **TICKET-037**: Remove LEAD_VENDOR_URL from EnvConfig
- **TICKET-038**: Update WorkerSettingsDAO to remove cooldown methods

**Deliverables**:
- Investors table dropped
- Investor code removed
- LEAD_VENDOR_URL removed

**Success Criteria**:
- [ ] No references to investors in codebase
- [ ] All tests pass
- [ ] Worker still functioning
- [ ] Buyers system stable for 2+ weeks

**Deploy Strategy**:
- **CRITICAL**: Only proceed if buyers system stable for 2+ weeks
- **Database backup before migration #33**
- Deploy to staging first
- Run migration #33 (irreversible)
- Test thoroughly
- Deploy to production:
  - Create production database backup
  - Run migration #33
  - Deploy code cleanup
  - Verify worker still works
  - Monitor for 24 hours

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code review complete
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Staging deployment successful
- [ ] Manual testing complete
- [ ] Doppler env vars verified (BUYER_AUTH_ENCRYPTION_KEY added)

### Deployment
- [ ] Disable worker (for Sprint 4 and 6)
- [ ] Run database migrations
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Test API endpoints
- [ ] Re-enable worker (if disabled)

### Post-Deployment
- [ ] Check server logs for errors
- [ ] Test critical flows (login, lead import, manual send)
- [ ] Verify worker running (if enabled)
- [ ] Monitor for 1 hour minimum
- [ ] Check buyer timing columns (next_send_at updates)
- [ ] Check send_log entries
- [ ] Check lead_buyer_outcomes entries

---

## Risk Mitigation Per Sprint

| Sprint | Primary Risk | Mitigation |
|--------|--------------|------------|
| 1 | Schema changes break app | Additive migrations only, nullable columns |
| 2 | Webhook integration failures | Mock endpoint in non-prod, extensive manual testing |
| 3 | iSpeedToLead webhook broken | Test in staging first, manual send before auto |
| 4 | Worker downtime | Disable worker during deploy, rollback plan ready, worker gating prevents unwanted sends |
| 5 | New buyer webhooks fail | Test manual first for manual buyers, enable auto_send one at a time for worker buyers |
| 6 | Data loss from dropping investors | Database backup required, 2+ week stabilization |

---

## Parallel Work Opportunities

**Sprints 1 & 2**: Can run in parallel (different files)
- Backend team: Tickets #1-9
- Frontend team: Tickets #10, #17-18

**Sprint 4**: Cannot parallelize (core refactor)

**Sprint 5**: Buyers can be added incrementally (tickets #26-30 can be spread over time)

---

## Timeline Summary

| Sprint | Duration | Start | End | Risk |
|--------|----------|-------|-----|------|
| Sprint 1 | 2 weeks | Week 1 | Week 2 | Low |
| Sprint 2 | 1.5 weeks | Week 3 | Week 4 | Medium |
| Sprint 3 | 0.5 weeks | Week 5 | Week 5 | Medium |
| Sprint 4 | 2.5 weeks | Week 5 | Week 7 | **HIGH** |
| Sprint 5 | 1 week | Week 8 | Week 8 | Low |
| Sprint 6 | 0.5 weeks | Week 9 | Week 10 | Medium |

**Total**: ~10 weeks (including buffer and stabilization periods)

---

## Go/No-Go Gates

### Before Sprint 4 (Worker Switchover)
- [ ] All Sprint 1-3 tickets complete
- [ ] Manual sends to buyers working perfectly
- [ ] Worker control (worker_enabled flag) tested
- [ ] iSpeedToLead buyer tested extensively
- [ ] Staging environment stable
- [ ] Team ready for potential rollback

### Before Sprint 6 (Drop Investors)
- [ ] Worker stable with buyers for 2+ weeks
- [ ] All 6 buyers tested
- [ ] Two-lane dispatch working (manual + worker)
- [ ] No critical bugs in production
- [ ] Database backup created
- [ ] Team approval to proceed
