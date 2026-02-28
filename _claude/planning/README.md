# Buyers Refactor Plan - Documentation Index

This folder contains the complete architecture analysis and implementation plan for migrating Automator 2.0 from the investors model to the buyers priority pipeline model with two-lane dispatch.

## Files Overview

| File | Description |
|------|-------------|
| **00_EXECUTIVE_SUMMARY.md** | High-level overview, timeline, key changes, two-lane dispatch model |
| **01_IMPACT_ANALYSIS.md** | Complete list of affected files/modules/tables |
| **02_DATABASE_MIGRATION_STRATEGY.md** | 5-stage migration path with SQL scripts (NO buyer_schedule table) |
| **03_SERVICE_REFACTOR_PLAN.md** | Service layer changes (new + refactored) |
| **04_WORKER_REFACTOR.md** | Worker automation changes, per-buyer timing, worker gating |
| **05_VENDOR_ABSTRACTION.md** | Multi-vendor webhook adapter with flexible auth |
| **06_LOGGING_STRATEGY.md** | send_log reuse strategy, lead_buyer_outcomes table |
| **07_RISK_ANALYSIS.md** | 18 risks with mitigations + severity table |
| **08_TICKETS.md** | All 38 tickets with acceptance criteria |
| **09_IMPLEMENTATION_ORDER.md** | 6-sprint breakdown with deploy strategies |
| **10_RECOMMENDATIONS.md** | Testing, monitoring, docs, security, rollback procedures |

## Quick Reference

### Total Effort
- **Sprints**: 6 (10 weeks including buffer)
- **Tickets**: 38 (Foundation → Cleanup)
- **Files Affected**: 45+ across all layers
- **Critical Sprint**: Sprint 4 (Worker Switchover) ⚠️ HIGH RISK

### Key Milestones
1. **Sprint 1**: Buyers infrastructure + admin UI (2 weeks)
2. **Sprint 2**: Manual sends + worker control working (1.5 weeks)
3. **Sprint 3**: iSpeedToLead migrated (0.5 weeks)
4. **Sprint 4**: Worker switchover (2.5 weeks) ⚠️
5. **Sprint 5**: All 6 buyers configured (1 week)
6. **Sprint 6**: Cleanup (0.5 weeks)

### Two-Lane Dispatch System

**Manual Buyers (Top Tier)**:
1. Compass (priority 1, dispatch_mode='manual')
2. Sellers (priority 2, dispatch_mode='manual')
3. Pickle (priority 3, dispatch_mode='manual')

**Worker Buyers (Drip/Lower Tier)**:
4. Motivated (priority 4, dispatch_mode='worker')
5. Andy (priority 5, dispatch_mode='worker')
6. iSpeedToLead (priority 6, fallback, dispatch_mode='worker')

## How to Use This Documentation

### For Developers

**Before Starting**:
1. Read `00_EXECUTIVE_SUMMARY.md` for context
2. Review `01_IMPACT_ANALYSIS.md` to understand scope
3. Read `09_IMPLEMENTATION_ORDER.md` for sprint breakdown

**During Implementation**:
1. Reference `08_TICKETS.md` for specific ticket details
2. Use `02_DATABASE_MIGRATION_STRATEGY.md` for SQL scripts
3. Check `03_SERVICE_REFACTOR_PLAN.md` for service patterns
4. Review `07_RISK_ANALYSIS.md` for edge cases

**Before Deploying**:
1. Follow deployment checklist in `09_IMPLEMENTATION_ORDER.md`
2. Review rollback procedures in `10_RECOMMENDATIONS.md`

### For Project Managers

**Planning**:
- `00_EXECUTIVE_SUMMARY.md` - Timeline + success criteria
- `09_IMPLEMENTATION_ORDER.md` - Sprint breakdown + resource allocation
- `07_RISK_ANALYSIS.md` - Risk severity table

**Tracking**:
- `08_TICKETS.md` - All 38 tickets with estimates
- `09_IMPLEMENTATION_ORDER.md` - Go/no-go gates per sprint

### For QA/Testing

**Test Plans**:
- `10_RECOMMENDATIONS.md` → Section 1: Testing Strategy
- `08_TICKETS.md` → Each ticket has test plan
- `07_RISK_ANALYSIS.md` → Edge cases to test

**Test Environments**:
- Manual sends: Sprint 2
- Worker automation: Sprint 4
- End-to-end pipeline: Sprint 5

### For DevOps

**Infrastructure**:
- `02_DATABASE_MIGRATION_STRATEGY.md` - All 5 migration scripts
- `05_VENDOR_ABSTRACTION.md` - Application-level encryption setup (BUYER_AUTH_ENCRYPTION_KEY)
- `10_RECOMMENDATIONS.md` - Monitoring + alerting rules

**Deployment**:
- `09_IMPLEMENTATION_ORDER.md` - Deploy strategies per sprint
- `10_RECOMMENDATIONS.md` → Section 7: Rollback procedures

## Critical Warnings

### ⚠️ Irreversible Migration (Stage 5)

**Migration #33** drops the `investors` table - this CANNOT be undone without database restore.

**Requirements before Stage 5**:
- [ ] Workers stable with buyers for 2+ weeks
- [ ] All 6 buyers tested in production
- [ ] Two-lane dispatch working correctly
- [ ] **Database backup created**
- [ ] Team approval to proceed

### ⚠️ Worker Switchover (Sprint 4)

**Highest risk phase** - worker logic completely changes + worker gating introduced.

**Requirements**:
- [ ] Extensive staging testing (48+ hours)
- [ ] Worker gating tested (worker_enabled flag)
- [ ] Rollback plan documented
- [ ] Team on-call during deployment
- [ ] Ability to disable worker immediately

## Key Architectural Decisions

### 1. No Separate Schedule Table
- Timing columns (`next_send_at`, `last_send_at`, `total_sends`) directly on `buyers` table
- Simpler schema, fewer joins, easier to maintain

### 2. Application-Level Encryption
- NOT using pgcrypto
- Node.js crypto module (AES-256-CBC)
- `BUYER_AUTH_ENCRYPTION_KEY` in Doppler

### 3. Flexible Auth Headers
- `auth_header_name` - Custom header name (e.g., "X-API-Key")
- `auth_header_prefix` - Optional prefix (e.g., "Bearer ", "ApiKey ")
- `auth_token_encrypted` - Encrypted token value

### 4. Append-Only Send Log
- NO unique constraints on send_log
- Allows retry attempts (multiple sends to same buyer)
- Better audit trail

### 5. Many-to-Many Sold Status
- `lead_buyer_outcomes` table
- Track which buyers purchased each lead
- Supports `allow_resell` logic

### 6. Worker Gating
- `leads.worker_enabled` boolean
- Worker ONLY processes leads where `worker_enabled=true`
- Set via "Send to Worker" button in UI

### 7. Two-Lane Dispatch
- `dispatch_mode` column on buyers ('manual' | 'worker' | 'both')
- Manual buyers: Send via UI only
- Worker buyers: Send via worker automation only
- Clear separation of high-value (manual) vs drip (worker) buyers

## Next Steps

1. **Review with team**: Walkthrough executive summary
2. **Validate estimates**: Review timeline with PM
3. **Set up tracking**: Create Jira/Linear epics from tickets
4. **Schedule sprints**: Block calendar for 10-week project
5. **Prepare staging**: Ensure staging env matches production
6. **Add encryption key**: Generate and add `BUYER_AUTH_ENCRYPTION_KEY` to Doppler

---

**Document Version**: 2.0 (Corrected Architecture)
**Last Updated**: 2026-02-27
**Author**: Claude Sonnet 4.5 (Architecture Analysis)
**Status**: Ready for Implementation
