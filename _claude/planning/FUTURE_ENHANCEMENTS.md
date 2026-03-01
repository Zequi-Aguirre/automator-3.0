# Future Enhancements Backlog

**Last Updated:** 2026-03-01
**Status:** Backlog / Post-Current Sprint

These are UI/UX enhancements and feature requests identified during current sprint. NOT part of the original refactor tickets (#1-41). Prioritize for upcoming sprints.

---

## Buyer Table Enhancements

### 1. Display "Worker / Manual" Instead of "Both"
**Priority:** Low
**Effort:** 1-2 hours

**Current:** Dispatch mode shows "both"
**Desired:** Show "Worker / Manual"

**Implementation:**
```typescript
const formatDispatchMode = (mode: string): string => {
  if (mode === 'both') return 'Worker / Manual';
  return mode.charAt(0).toUpperCase() + mode.slice(1);
};
```

**Files:** `client/src/components/admin/adminBuyersSection/AdminBuyersSection.tsx`

---

### 2. Show Buyer Settings as Table Columns
**Priority:** Medium
**Effort:** 3-4 hours

**Current:** Auto Send, Allow Resell, Requires Validation only visible in modal
**Desired:** Add columns with ✓/✗ icons

**Files:** `client/src/components/admin/adminBuyersSection/AdminBuyersSection.tsx`

---

### 3. Collapsible Authorization Section
**Priority:** Medium
**Effort:** 2-3 hours

**Current:** Auth fields always visible
**Desired:** Toggle switch "Authorization Required" → shows/hides auth fields

**Files:**
- `client/src/components/admin/adminBuyersSection/AdminBuyersSection.tsx`
- `server/src/main/types/buyerTypes.ts` (add `auth_required`)
- `server/src/main/data/buyerDAO.ts`

---

### 4. Click to Edit Next Send Time ⭐
**Priority:** High
**Effort:** 4-5 hours

**Current:** Next send time read-only
**Desired:** Click timestamp → time picker → update `next_send_at`

**Implementation:**
- MUI DateTimePicker
- Update via existing `PATCH /api/buyers/:id`

**Files:** `client/src/components/admin/adminBuyersSection/AdminBuyersSection.tsx`

---

## Leads Table Enhancements

### 5. Click Name to Open Details
**Priority:** Medium
**Effort:** 1-2 hours

**Current:** Separate "Details" button
**Desired:** Click on lead name to open details modal

---

### 6. Use Icon for Trash Action
**Priority:** Low
**Effort:** 1 hour

**Current:** Text/button for trash
**Desired:** Small trash icon (like buyers table)

---

### 7. Enable/Disable Worker Toggle
**Priority:** Medium
**Effort:** 3-4 hours

**Current:** Must open modal to change `worker_enabled`
**Desired:** Click worker status in table to toggle

---

### 8. Advanced Filtering ⭐
**Priority:** High
**Effort:** 8-10 hours

**Current Filters:**
- Status: New, Verified, Sent, Trash
- Search: County (ILIKE)

**Desired Reorganization:**

#### Status Filters
- **New** - All leads not sent, not trashed
- **Worker Queue** - `worker_enabled=true`
  - Sub-filter: Verified / Unverified
- **Sent** - Sent to ANY buyer
  - Sub-filter: Sent to specific buyer (dropdown)
  - Sub-filter: Send method (Worker / Manual / Auto)
- **Trash** - Deleted leads

#### New Filters
- **County** - Autocomplete dropdown (not ILIKE)
- **State** - Multi-select
- **Affiliate** - Dropdown
- **Campaign** - Dropdown
- **Investor** - Dropdown
- **Verification** - Independent filter

**Backend Changes:**
- Update `leadDAO.getMany()` to accept new filter params
- Join `send_log` to filter by buyer/method
- Join `campaigns` for affiliate filtering

**Files:**
- Lead table component (extensive UI)
- `server/src/main/data/leadDAO.ts`
- `server/src/main/resources/leadResource.ts`

---

### 9. Track Send Method ⭐
**Priority:** Medium
**Effort:** 4-5 hours

**Current:** No record of HOW lead was sent
**Desired:** Add `send_method` to `send_log` table

**Values:** 'worker' | 'manual' | 'auto'

**Migration:**
```sql
ALTER TABLE send_log
ADD COLUMN send_method VARCHAR(20) DEFAULT 'manual';
```

**Files:**
- New migration
- `server/src/main/types/sendLogTypes.ts`
- `server/src/main/data/sendLogDAO.ts`
- `server/src/main/services/buyerDispatchService.ts`
- `server/src/main/services/workerService.ts`

---

## Logs Table Enhancements

### 10. Show Success/Failure Status ⭐
**Priority:** High
**Effort:** 2 hours

**Current:** Raw status text
**Desired:**
- Green checkmark for 'sent'
- Red X for 'failed'
- Tooltip with response code/error

---

### 11. Show Lead Context ⭐
**Priority:** Medium
**Effort:** 3-4 hours

**Current:** Only shows Lead ID, Buyer, Status
**Desired:** Show:
- Lead Name (first_name + last_name)
- County
- State
- Affiliate
- Campaign
- Investor
- Payout

**Backend:**
- Update `sendLogDAO.getLogs()` to join tables
- Return enriched log records

**Files:**
- `server/src/main/data/sendLogDAO.ts`
- `server/src/main/types/sendLogTypes.ts`
- Logs table component

---

## Counties Management

### 12. Import Counties from CSV ⭐
**Priority:** High
**Effort:** 4-6 hours

**Problem:**
- Lead import auto-creates counties
- Missing timezone, population, FIPS code

**Solution:**
1. Create `POST /api/counties/import` endpoint
2. Import master CSV with full metadata
3. Lead import ONLY references existing counties
4. Reject leads with unknown counties

**Files:**
- `server/src/main/resources/countyResource.ts`
- `server/src/main/services/countyService.ts`
- Lead import logic

---

### 13. Buyer-Specific County Blocking
**Priority:** Medium
**Effort:** 4-5 hours

**Current:** Global county blacklist OR state blocking per-buyer
**Desired:** Per-buyer county blocking (like `states_on_hold`)

**Implementation:**
```sql
ALTER TABLE buyers
ADD COLUMN counties_on_hold UUID[] DEFAULT '{}';
```

**Files:**
- New migration
- `server/src/main/types/buyerTypes.ts`
- `server/src/main/data/buyerDAO.ts`
- `server/src/main/services/workerService.ts`
- Buyer form UI

---

### 14. Counties Blacklist Enforcement ⭐
**Priority:** High
**Effort:** 2-3 hours

**Problem:**
- Miami-Dade and Broward blacklisted in migrations
- Worker still dispatches to blacklisted counties
- No enforcement during send

**Solution:**
- Add county blacklist check in BuyerDispatchService.applyFilters()
- Skip leads with blacklisted counties during worker processing
- Show warning in UI when county is blacklisted

**Files:**
- `server/src/main/services/buyerDispatchService.ts`
- `server/src/main/services/countyService.ts`

---

### 15. County Matching on Import - Reject Unknown Counties ⭐
**Priority:** High
**Effort:** 4-6 hours

**Problem:**
- CSV import auto-creates counties (missing metadata like timezone, FIPS)
- Unknown counties should be flagged, not auto-created

**Solution:**
1. Import must match to existing county in DB
2. If no match → mark lead as "Needs Review" status
3. Don't auto-create counties
4. Use existing code from Compass backend for matching

**Files:**
- `server/src/main/services/leadService.ts` (importLeads)
- `server/src/main/services/countyService.ts`
- New "needs_review" status/flag

**Related:** Works with #12 (Import Counties from CSV)

---

### 16. Incomplete Leads Filter/Status ⭐
**Priority:** High
**Effort:** 3-4 hours

**Problem:**
- No way to identify leads missing required data
- Different from verification (which is about form questions)

**Solution:**
1. New lead status: "Needs Review" or "Incomplete"
2. Filter in leads table for admins
3. Separate view/permission for lower-level users
4. Triggered when: county missing, invalid phone, etc.

**Implementation:**
```sql
ALTER TABLE leads
ADD COLUMN needs_review BOOLEAN DEFAULT false;

-- OR use existing deleted_reason field differently
```

**Files:**
- New migration
- `server/src/main/types/leadTypes.ts`
- Lead table UI with new filter
- `server/src/main/data/leadDAO.ts`

---

### 17. Form Data in Lead Intake API
**Priority:** Medium
**Effort:** 4-5 hours

**Problem:**
- API doesn't accept form field values
- Leads require manual form entry in platform

**Solution:**
- Accept form questions in API payload
- Create lead_form_input record if form data provided
- Auto-verify lead if all required fields present
- No manual entry needed

**Implementation:**
```typescript
// POST /api/leads-intake
{
  name: "John Doe",
  phone: "555-1234",
  // ... existing fields
  form_data: {
    form_multifamily: "No",
    form_repairs: "Yes",
    form_occupied: "No",
    // ... all form fields
  }
}
```

**Files:**
- `server/src/main/resources/leadIntakeResource.ts`
- `server/src/main/services/leadService.ts` (importLeadsFromApi)
- `server/src/main/data/leadFormInputDAO.ts`

---

### 18. Campaigns Nested in Affiliates UI
**Priority:** Medium
**Effort:** 6-8 hours

**Problem:**
- Campaigns is top-level nav item
- Should be nested inside affiliates

**Solution:**
1. Remove "Campaigns" from main navigation
2. Add campaigns tab/section inside affiliate detail view
3. Show campaign performance per affiliate
4. Campaign CRUD operations inside affiliate page

**Files:**
- `client/src/components/navBar/NavBar.tsx` (remove from nav)
- `client/src/views/adminViews/AdminAffiliatesView.tsx` (add campaigns section)
- `client/src/components/admin/adminCampaignsSection/` (refactor for nested use)
- `client/src/context/routes/AdminRoutes.tsx` (remove campaign route)

---

### 19. Verify Toggle in Leads Table
**Priority:** Medium
**Effort:** 2-3 hours

**Problem:**
- Can't verify/unverify from table
- Must open modal

**Solution:**
- Clickable verify status in table
- Toggle verified state inline
- Call existing verifyLead/unverifyLead endpoints

**Files:**
- Lead table component
- Uses existing `PATCH /api/leads/:id/verify` and `/unverify`

---

### 20. Enable Worker from Lead Detail Page
**Priority:** Medium
**Effort:** 2-3 hours

**Problem:**
- Can't enable worker from lead detail page
- Only accessible from table

**Solution:**
- Add "Enable Worker" button/toggle in detail modal
- Call existing `POST /api/leads/:id/enable-worker` endpoint
- Show current worker_enabled status

**Files:**
- Lead detail modal/view component
- Uses existing endpoint

---

### 21. Column Ordering in Leads Table
**Priority:** Low
**Effort:** 2-3 hours

**Problem:**
- Column order not optimal for workflow

**Solution:**
- TBD (user will specify preferred order)
- Possibly make columns draggable/configurable

**Files:**
- Lead table component

---

## Prioritization Matrix

| # | Enhancement | Priority | Effort | Impact | Hours |
|---|-------------|----------|--------|--------|-------|
| **HIGH PRIORITY (Critical)** |||||
| 14 | Counties Blacklist Enforcement | High | Small | High | 2-3 |
| 15 | County Matching - Reject Unknown | High | Medium | High | 4-6 |
| 16 | Incomplete Leads Filter/Status | High | Medium | High | 3-4 |
| 4 | Click to Edit Next Send Time | High | Medium | High | 4-5 |
| 8 | Advanced Filtering | High | Large | High | 8-10 |
| 10 | Show Success/Failure Status | High | Small | Medium | 2 |
| 12 | Import Counties from CSV | High | Medium | High | 4-6 |
| **MEDIUM PRIORITY** |||||
| 17 | Form Data in Lead Intake API | Medium | Medium | High | 4-5 |
| 18 | Campaigns Nested in Affiliates | Medium | Large | Medium | 6-8 |
| 19 | Verify Toggle in Leads Table | Medium | Small | Medium | 2-3 |
| 20 | Enable Worker from Detail Page | Medium | Small | Medium | 2-3 |
| 9 | Track Send Method | Medium | Medium | Medium | 4-5 |
| 11 | Show Lead Context | Medium | Medium | High | 3-4 |
| 13 | Buyer-Specific County Blocking | Medium | Medium | Medium | 4-5 |
| 2 | Show Buyer Settings Columns | Medium | Medium | Low | 3-4 |
| 3 | Collapsible Authorization | Medium | Small | Low | 2-3 |
| 5 | Click Name to Open Details | Medium | Small | Low | 1-2 |
| 7 | Enable/Disable Worker Toggle | Medium | Medium | Medium | 3-4 |
| **LOW PRIORITY** |||||
| 21 | Column Ordering in Leads Table | Low | Small | Low | 2-3 |
| 1 | Display "Worker / Manual" | Low | Small | Low | 1-2 |
| 6 | Use Icon for Trash | Low | Small | Low | 1 |

**Total Estimated:** ~75-95 hours

---

## Recommended Next Sprint

**Focus: Data Quality & Critical Fixes**

### Sprint 7A: Critical Fixes (11-15 hours / 1-2 days)
**Must-haves for production stability:**
1. Counties Blacklist Enforcement (14) - 2-3 hrs ⚠️ URGENT
2. County Matching - Reject Unknown (15) - 4-6 hrs ⚠️ URGENT
3. Incomplete Leads Filter/Status (16) - 3-4 hrs ⚠️ URGENT
4. Show Success/Failure Status (10) - 2 hrs

**Why these first:**
- #14: Worker currently ignoring blacklists (data quality issue)
- #15: Auto-creating counties breaks metadata (blocks #12)
- #16: Need visibility into incomplete leads
- #10: Quick win for logs visibility

---

### Sprint 7B: UX Improvements (14-19 hours / 2-3 days)
**Quick wins for daily workflow:**
1. Verify Toggle in Leads Table (19) - 2-3 hrs
2. Enable Worker from Detail Page (20) - 2-3 hrs
3. Enable/Disable Worker Toggle (7) - 3-4 hrs
4. Use Icon for Trash (6) - 1 hr
5. Click to Edit Next Send Time (4) - 4-5 hrs
6. Form Data in Lead Intake API (17) - 4-5 hrs (optional)

---

### Sprint 7C: Major Features (18-24 hours / 3-4 days)
**Bigger improvements (after critical fixes):**
1. Import Counties from CSV (12) - 4-6 hrs (requires #15 first)
2. Advanced Filtering (8) - 8-10 hrs
3. Campaigns Nested in Affiliates (18) - 6-8 hrs

---

## Proposed Execution Order

**Week 1:** Sprint 7A (Critical Fixes)
**Week 2:** Sprint 7B (UX Improvements)
**Week 3:** Sprint 7C (Major Features)

**Total:** ~43-58 hours over 3 weeks

---

## Notes

- All estimates include implementation + manual testing
- Does NOT include code review or QA cycles
- Some items have dependencies (e.g., #9 depends on #11)
- Integration/E2E testing not currently in scope
- Estimates assume familiarity with codebase

---

**Document Owner:** TBD
**Target Sprint:** TBD
**Created:** 2026-02-28
