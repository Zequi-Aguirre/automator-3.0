# Future Enhancements Backlog

**Last Updated:** 2026-02-28
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

## Prioritization Matrix

| # | Enhancement | Priority | Effort | Impact | Hours |
|---|-------------|----------|--------|--------|-------|
| 4 | Click to Edit Next Send Time | High | Medium | High | 4-5 |
| 8 | Advanced Filtering | High | Large | High | 8-10 |
| 9 | Track Send Method | Medium | Medium | Medium | 4-5 |
| 10 | Show Success/Failure Status | High | Small | Medium | 2 |
| 11 | Show Lead Context | Medium | Medium | High | 3-4 |
| 12 | Import Counties from CSV | High | Medium | High | 4-6 |
| 13 | Buyer-Specific County Blocking | Medium | Medium | Medium | 4-5 |
| 1 | Display "Worker / Manual" | Low | Small | Low | 1-2 |
| 2 | Show Buyer Settings Columns | Medium | Medium | Low | 3-4 |
| 3 | Collapsible Authorization | Medium | Small | Low | 2-3 |
| 5 | Click Name to Open Details | Medium | Small | Low | 1-2 |
| 6 | Use Icon for Trash | Low | Small | Low | 1 |
| 7 | Enable/Disable Worker Toggle | Medium | Medium | Medium | 3-4 |

**Total Estimated:** ~45-55 hours

---

## Recommended Next Sprint

**Focus: User Experience & Data Quality**

**High Priority Items (18-23 hours):**
1. Click to Edit Next Send Time (4) - 4-5 hrs
2. Show Success/Failure Status (10) - 2 hrs
3. Import Counties from CSV (12) - 4-6 hrs
4. Advanced Filtering (8) - 8-10 hrs

**Medium Priority Items (11-14 hours):**
5. Track Send Method (9) - 4-5 hrs
6. Show Lead Context (11) - 3-4 hrs
7. Buyer-Specific County Blocking (13) - 4-5 hrs

**Total Next Sprint:** ~29-37 hours (4-5 days)

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
