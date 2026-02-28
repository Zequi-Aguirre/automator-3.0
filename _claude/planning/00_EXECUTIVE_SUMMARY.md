# Executive Summary: Investors → Buyers Refactor

## Overview

This refactor transforms Automator 2.0 from a **single-investor, single-send model** to a **multi-buyer priority pipeline** with two-lane dispatch (manual + worker), per-buyer timing, and flexible authentication.

## Current State (AS-IS)

- Leads sent to single "investor" (iSpeedToLead)
- Global worker timing (one `send_next_lead_at` timestamp)
- Global cooldowns (same investor/county/state)
- Hardcoded vendor integration
- One send per lead paradigm

## Target State (TO-BE)

- Multiple buyers with priority pipeline (1-6)
- **Two-lane dispatch**:
  - **Manual buyers**: Compass, Sellers, Pickle (top tier, sent manually from UI)
  - **Worker buyers**: Motivated, Andy, iSpeedToLead (drip/lower tier, automated)
- Per-buyer timing (each buyer has independent `min/max_minutes_between_sends`)
- Lead-level worker gating (`leads.worker_enabled` controls worker processing)
- Many-to-many sold status (track which buyers purchased lead)
- Per-buyer authentication (custom header name/prefix + encrypted token)
- Append-only send history (multiple attempts allowed)

## Buyer Priority Order & Dispatch Lanes

### Manual Buyers (Top Tier)
1. **Compass** (priority 1, `dispatch_mode: 'manual'`)
2. **Sellers** (priority 2, `dispatch_mode: 'manual'`)
3. **Pickle** (priority 3, `dispatch_mode: 'manual'`)

### Worker Buyers (Drip/Lower Tier)
4. **Motivated** (priority 4, `dispatch_mode: 'worker'`)
5. **Andy** (priority 5, `dispatch_mode: 'worker'`)
6. **iSpeedToLead** (priority 6, fallback, `dispatch_mode: 'worker'`)

## Key Changes

### Database
- ✅ **NEW**: `buyers` table (priority, auth, timing config, dispatch_mode)
- ✅ **NEW**: `lead_buyer_outcomes` table (many-to-many sold status)
- ✅ **MODIFY**: `leads` (add `worker_enabled` boolean)
- ✅ **MODIFY**: `send_log` (add `buyer_id` FK, remove unique constraints)
- ⚠️ **REMOVE**: `investors` table (after migration)
- ⚠️ **REMOVE**: `delay_same_investor/county/state` from `worker_settings`

### Backend Services
- ✅ **NEW**: `BuyerService` (entity CRUD)
- ✅ **NEW**: `BuyerDispatchService` (orchestrator for priority dispatch)
- ✅ **NEW**: `BuyerWebhookAdapter` (generic HTTP client with flexible auth)
- ✅ **REFACTOR**: `WorkerService` (process all worker buyers, check `worker_enabled`)
- ✅ **REFACTOR**: `LeadService` (remove investor_id handling)
- ⚠️ **REMOVE**: `InvestorService`, `iSpeedToLeadIAO`

### Frontend
- ✅ **NEW**: Admin buyers CRUD UI
- ✅ **NEW**: Buyer send modal (manual send + sold toggle + attempt history)
- ✅ **NEW**: "Send to Worker" button (sets `worker_enabled=true`)
- ✅ **MODIFY**: Lead table (add "Buyers" column)
- ⚠️ **REMOVE**: Investors section

## Migration Philosophy

**Incremental & Safe**: Introduce buyers alongside investors, migrate iSpeedToLead first, switch worker, then remove investors.

### 5-Stage Migration

1. **Stage 1**: Create `buyers` table + `lead_buyer_outcomes` table
2. **Stage 2**: Add `buyer_id` to `send_log` + `worker_enabled` to `leads`
3. **Stage 3**: Migrate iSpeedToLead → first buyer record
4. **Stage 4**: Switch worker to use buyers (CODE DEPLOY)
5. **Stage 5**: Drop `investors` table (after 2+ weeks stable)

## Timeline

| Phase | Sprints | Duration | Risk Level |
|-------|---------|----------|------------|
| Foundation & Admin UI | Sprint 1 | 2 weeks | Low |
| Dispatch Logic & Manual Sends | Sprint 2 | 1.5 weeks | Medium |
| iSpeedToLead Migration | Sprint 3 | 0.5 weeks | Medium |
| **Worker Switchover** | **Sprint 4** | **2.5 weeks** | **HIGH** |
| Add New Buyers | Sprint 5 | 1 week | Low |
| Cleanup & Deprecation | Sprint 6 | 0.5 weeks | Low |
| **TOTAL** | **6 sprints** | **~10 weeks** | - |

**Critical Sprint**: Sprint 4 (Worker Switchover) - requires extensive testing before production.

## Success Criteria

- [ ] All 6 buyers configured and sending
- [ ] Manual buyers (Compass, Sellers, Pickle) send via UI
- [ ] Worker buyers (Motivated, Andy, iSpeedToLead) send automatically when `worker_enabled=true`
- [ ] Priority pipeline works (Compass → iSpeedToLead)
- [ ] Per-buyer timing verified (independent send intervals)
- [ ] `allow_resell=false` stops pipeline after successful sale
- [ ] Many-to-many sold status tracked per buyer
- [ ] Worker automation stable for 2+ weeks
- [ ] Investors table removed, code cleaned up
- [ ] Zero data loss during migration

## Rollback Points

- **Before Stage 4**: Full rollback possible (investors still exist)
- **After Stage 4**: Rollback requires worker disable + code revert
- **After Stage 5**: No rollback (investors table dropped) - **REQUIRES BACKUP**

## Key Risks

1. **Worker downtime** during switchover (Sprint 4)
2. **Duplicate sends** if concurrency not handled
3. **Auth token security** if encryption not implemented correctly
4. **Performance degradation** with `allow_resell` queries
5. **Data loss** if Stage 5 migration fails

**Mitigation**: Incremental deployment, extensive testing, database backups before Stage 5.

---

**Next Steps**: Review detailed analysis files in this folder.
