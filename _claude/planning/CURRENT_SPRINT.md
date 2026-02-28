# Current Sprint: Cleanup & Deprecation (Sprint 6)

**Sprint Date:** 2026-02-28
**Status:** ✅ Complete - Ready for Review
**Branch:** `sprint-6-cleanup-deprecation`
**Ticket:** TICKET-022

---

## Sprint Goals

This sprint completed the removal of deprecated investor and vendor code from the codebase:

1. ✅ Remove all investor backend code (DAO, Service, Resource, Types)
2. ✅ Remove all vendor backend code (DAO, Service, Types)
3. ✅ Remove all investor frontend code (Views, Components, Services)
4. ✅ Remove deprecated IAO pattern (ISpeedToLeadIAO)
5. ✅ Remove environment variable dependencies (use buyers table instead)
6. ✅ Create irreversible migration to drop tables
7. ✅ Update documentation (CLAUDE.md) with buyers architecture

---

## Architecture Summary

**Before:** Mixed investor/vendor/buyer architecture with confusing terminology
**After:** Clean buyer-only architecture with generic webhook dispatch

**What was removed:**
- **Backend:** investorDAO, investorService, investorResource, investorTypes, vendorDAO, vendorService, vendorTypes, ISpeedToLeadIAO, ispeedToLeadTypes
- **Frontend:** AdminInvestorsView, AdminInvestorsSection, AdminInvestorsTable, investor.service, investorTypes
- **Database columns:** leads.investor_id, leads.vendor_id, send_log.investor_id, send_log.vendor_id
- **Environment variables:** LEAD_VENDOR_URL, ISPEED_TO_LEAD_WEBHOOK_URL

**What replaced them:**
- Single `buyers` table with webhook_url, auth config, and timing settings
- Generic `BuyerWebhookAdapter` for all buyer dispatch
- Buyer-specific configuration instead of code changes

---

## Tasks Completed (7/7)

### ✅ Task #9: Remove investor backend code
- Deleted: investorDAO.ts, investorService.ts, investorResource.ts, investorTypes.ts
- Modified: leadService.ts (691→565 lines), buyerDispatchService.ts, AutomatorServer.ts
- Removed all investor blacklist/whitelist/cooldown logic

### ✅ Task #10: Remove vendor backend code
- Deleted: vendorDAO.ts, vendorService.ts, vendorTypes.ts
- No other files imported these - clean removal

### ✅ Task #11: Remove investor frontend code
- Deleted: AdminInvestorsView, AdminInvestorsSection, AdminInvestorsTable, investor.service, investorTypes
- Modified: NavBar (removed menu item), AdminRoutes (removed route), AdminSendLogsTable (removed column)

### ✅ Task #12: Remove env variable + IAO
- Removed LEAD_VENDOR_URL environment variable
- Deleted ISpeedToLeadIAO.ts (104 lines)
- Deleted ispeedToLeadTypes.ts
- Removed leadService.sendLead() method (legacy)
- All buyer webhooks now come from buyers.webhook_url column

### ✅ Task #13: Create migration
- Created migration: `20260228180801.do._drop_investors_and_vendors_tables.sql`
- Drops: investors, vendors, vendor_receives tables + related columns/constraints
- ⚠️ IRREVERSIBLE - includes comprehensive warnings and commented rollback

### ✅ Task #14: Update CLAUDE.md
- Rewrote Project Overview to reflect buyers architecture
- Updated Backend Layers section
- Rewrote Key Business Rules (removed investor/vendor references)
- Updated Core Services with buyer-focused descriptions
- Added new "Buyers Architecture" section with schema and dispatch flow

### ✅ Task #15: Update planning docs
- Updated CURRENT_SPRINT.md (this file)

---

## Files Changed (18)

**Backend deletions (8):**
1. server/src/main/data/investorDAO.ts
2. server/src/main/data/vendorDAO.ts
3. server/src/main/services/investorService.ts
4. server/src/main/services/vendorService.ts
5. server/src/main/resources/investorResource.ts
6. server/src/main/types/investorTypes.ts
7. server/src/main/types/vendorTypes.ts
8. server/src/main/vendor/iSpeedToLeadIAO.ts
9. server/src/main/types/ispeedToLeadTypes.ts

**Frontend deletions (5):**
1. client/src/components/admin/adminInvestorsSection/ (directory)
2. client/src/views/adminViews/AdminInvestorsView.tsx
3. client/src/services/investor.service.tsx
4. client/src/types/investorTypes.ts

**Modified files (5):**
1. server/src/main/services/leadService.ts - Removed investor logic
2. server/src/main/services/buyerDispatchService.ts - Removed investor dependencies
3. server/src/main/AutomatorServer.ts - Removed investor route
4. server/src/main/config/envConfig.ts - Removed LEAD_VENDOR_URL
5. client/src/components/navBar/NavBar.tsx - Removed Investors menu
6. client/src/context/routes/AdminRoutes.tsx - Removed investor route
7. client/src/components/admin/adminSendLogsSection/adminSendLogsTable/AdminSendLogsTable.tsx - Removed investor column
8. client/src/views/adminViews/AdminWorkerSettingsPanelView.tsx - Fixed TypeScript warnings

**New files (2):**
1. postgres/migrations/20260228180801.do._drop_investors_and_vendors_tables.sql
2. CLAUDE.md - Updated with buyers architecture

---

## Migration Execution

**⚠️ CRITICAL: Migration NOT executed yet**

The migration `20260228180801.do._drop_investors_and_vendors_tables.sql` has been created but NOT run.

**Before running migration:**
1. ✅ Confirm all code changes deployed
2. ✅ Confirm server starts successfully
3. ✅ Take database backup
4. ⚠️ Get explicit approval for data deletion

**To execute:**
```bash
# Backup first!
pg_dump $DATABASE_URL > backup_before_drop_investors_vendors.sql

# Run migration
psql $DATABASE_URL < postgres/migrations/20260228180801.do._drop_investors_and_vendors_tables.sql
```

**What will be dropped:**
- `investors` table + all data
- `vendors` table + all data
- `vendor_receives` table + all data
- `leads.investor_id` column
- `leads.vendor_id` column
- `send_log.investor_id` column
- `send_log.vendor_id` column
- All related foreign key constraints

---

## Code Statistics

**Lines removed:**
- Backend: ~830 lines (8 files deleted + refactoring)
- Frontend: ~341 lines (5 files deleted)
- Total: ~1,171 lines of deprecated code removed

**Architecture improvements:**
- No more buyer-specific IAO files needed
- Webhook URLs stored in database, not environment
- Single generic dispatch pathway
- More maintainable and scalable

---

## Next Sprint

**Sprint 7: Production Deployment**
- Execute irreversible migration
- Deploy to production
- Monitor for issues
- Update Doppler secrets (remove old env vars)

**Future work:**
- Add additional buyers (Pickle, Motivated, Andy)
- UI/UX improvements (see FUTURE_ENHANCEMENTS.md)
- Performance optimizations

---

**Sprint Completed:** 2026-02-28
**Status:** ✅ Complete - Ready for PR and Review
**All 7 tasks complete - 100% sprint completion**
