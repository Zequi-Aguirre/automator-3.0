# QA Session - March 2, 2026

**Session Type:** Post-Sprint 7 QA and Feature Planning
**Status:** In Progress
**User:** Zequi
**Focus:** UI/UX improvements, navigation cleanup, and advanced filtering

---

## 🎯 QA Findings & New Tickets

### Navigation & Structure

#### TICKET-QA-001: Remove Campaigns from Navbar - Nest in Sources
**Priority:** High
**Effort:** 2-3 hours

**Current:** Campaigns has its own navbar item
**Desired:** Campaigns should be nested inside Source details page

**Implementation:**
- Remove "Campaigns" from navbar
- Add Campaigns section to Source details view (expandable table or tab)
- Show campaign count badge on each source row
- Click source → see source details + campaigns list
- Can create/edit campaigns from within source view

**Files:**
- `client/src/components/navBar/NavBar.tsx`
- `client/src/components/admin/adminSourcesSection/SourceDetailsView.tsx` (new)
- `client/src/context/routes/AdminRoutes.tsx`

---

#### TICKET-QA-002: Remove Affiliates from Navbar
**Priority:** High
**Effort:** 30 minutes

**Current:** Affiliates still in navbar (deprecated)
**Desired:** No affiliates UI - replaced by Sources

**Implementation:**
- Remove "Affiliates" menu item from navbar
- Remove affiliate route if it exists
- Affiliates table in database remains for historical data

**Files:**
- `client/src/components/navBar/NavBar.tsx`
- `client/src/context/routes/AdminRoutes.tsx`

---

### County-Buyer Filtering (Advanced)

#### TICKET-QA-003: Implement County-Buyer Allow/Block System
**Priority:** High
**Effort:** 8-10 hours

**Requirements:**
County-buyer relationship supports **4 modes**:
1. **Allow All** (default) - County can go to any buyer
2. **Block All** - County cannot go to any buyer (rare)
3. **Allow Specific** - County can ONLY go to selected buyers (whitelist)
4. **Block Specific** - County can go to all EXCEPT selected buyers (blacklist)

**Database:**
```sql
-- Add to buyers table
ALTER TABLE buyers ADD COLUMN allowed_county_ids UUID[] DEFAULT NULL;
ALTER TABLE buyers ADD COLUMN blocked_county_ids UUID[] DEFAULT NULL;

-- Logic:
-- If allowed_county_ids IS NOT NULL → whitelist mode (only these counties)
-- If blocked_county_ids IS NOT NULL → blacklist mode (all except these)
-- If both NULL → allow all
```

**OR Alternative (county-centric):**
```sql
-- New table for explicit relationships
CREATE TABLE county_buyer_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID NOT NULL REFERENCES counties(id),
    buyer_id UUID NOT NULL REFERENCES buyers(id),
    rule_type VARCHAR(20) NOT NULL, -- 'allow' or 'block'
    created TIMESTAMPTZ DEFAULT NOW(),
    modified TIMESTAMPTZ DEFAULT NOW(),
    deleted TIMESTAMPTZ,
    UNIQUE(county_id, buyer_id, deleted)
);
```

**UI - County Details Page:**
- Section: "Buyer Access Rules"
- Radio buttons:
  - ⚪ Allow all buyers (default)
  - ⚪ Block all buyers
  - ⚪ Allow only specific buyers → Multi-select dropdown
  - ⚪ Block specific buyers → Multi-select dropdown
- Show current rules as chips with buyer names

**UI - Buyer Edit Modal:**
- Section: "County Filters"
- Radio buttons:
  - ⚪ Accept all counties (default)
  - ⚪ Accept only specific counties → Multi-select dropdown
  - ⚪ Block specific counties → Multi-select dropdown

**Backend Logic:**
```typescript
// In buyerDispatchService.canSendLeadToBuyer()
// Check county-buyer rules
if (buyer.allowed_county_ids && !buyer.allowed_county_ids.includes(lead.county_id)) {
  return { allowed: false, reason: "County not in buyer's whitelist" };
}
if (buyer.blocked_county_ids && buyer.blocked_county_ids.includes(lead.county_id)) {
  return { allowed: false, reason: "County is blocked for this buyer" };
}
```

**Acceptance Criteria:**
- [ ] Can set county to "allow only these buyers"
- [ ] Can set county to "block these buyers"
- [ ] Can set buyer to "accept only these counties"
- [ ] Can set buyer to "block these counties"
- [ ] Worker respects rules (skips filtered leads)
- [ ] Manual send shows disabled button with reason tooltip
- [ ] County details shows which buyers have access
- [ ] Buyer details shows which counties are filtered

---

#### TICKET-QA-004: Campaign-Buyer Allow/Block System
**Priority:** Medium
**Effort:** 6-8 hours

**Requirements:**
Same 4-mode system as counties, but for campaigns:
1. Allow All
2. Block All
3. Allow Specific Buyers
4. Block Specific Buyers

**Use Case:**
- Buyer "Compass" only wants leads from campaigns "Facebook Q1" and "Google Ads"
- Buyer "Pickle" wants all campaigns EXCEPT "Low Quality Source"

**Database:**
```sql
-- Add to buyers table
ALTER TABLE buyers ADD COLUMN allowed_campaign_ids UUID[] DEFAULT NULL;
ALTER TABLE buyers ADD COLUMN blocked_campaign_ids UUID[] DEFAULT NULL;
```

**UI - Campaign Details:**
- Section: "Buyer Access Rules"
- Same 4-mode radio UI as counties

**UI - Buyer Edit Modal:**
- Section: "Campaign Filters"
- Same 4-mode radio UI

**Backend Logic:**
```typescript
// In buyerDispatchService.canSendLeadToBuyer()
if (lead.campaign_id) {
  if (buyer.allowed_campaign_ids && !buyer.allowed_campaign_ids.includes(lead.campaign_id)) {
    return { allowed: false, reason: "Campaign not in buyer's whitelist" };
  }
  if (buyer.blocked_campaign_ids && buyer.blocked_campaign_ids.includes(lead.campaign_id)) {
    return { allowed: false, reason: "Campaign is blocked for this buyer" };
  }
}
```

**Acceptance Criteria:**
- [ ] Same as TICKET-QA-003 but for campaigns

---

### Lead Import & Validation

#### TICKET-QA-005: "Needs Review" Status for Incomplete Leads
**Priority:** High
**Effort:** 6-8 hours

**Current:** Leads missing email/county/state are rejected during import
**Desired:** Import as "Needs Review" status for VA manual fixing

**Use Case:**
- Lead has name + phone but no email → import as "needs review"
- Lead has unknown county "ST. LUCIE, FL" → import as "needs review"
- VA can skip trace (find email, verify county spelling)
- VA can mark as complete after fixing

**Database:**
```sql
-- Add to leads table
ALTER TABLE leads ADD COLUMN status VARCHAR(20) DEFAULT 'new';
-- Values: 'new', 'needs_review', 'verified', 'sent', 'sold', 'trashed'

-- Add review notes
ALTER TABLE leads ADD COLUMN review_notes TEXT;
```

**Import Logic Changes:**
```typescript
// Instead of rejecting, create as needs_review
if (!lead.email || !lead.county_id || !lead.state) {
  lead.status = 'needs_review';
  lead.review_notes = generateReviewNotes(lead); // "Missing: email, county"
  // Still import!
}
```

**UI - Leads Table:**
- Add "Status" column with badges:
  - 🟢 New
  - 🟡 Needs Review (yellow)
  - ✅ Verified (green)
  - 📤 Sent
  - 💰 Sold
- Filter by status
- "Needs Review" tab shows count badge

**UI - Lead Details:**
- If status = needs_review:
  - Show yellow banner: "⚠️ This lead needs review"
  - Show review_notes: "Missing: email, county not matched"
  - Editable fields for VA to fix
  - "Mark as Complete" button → changes status to 'new'

**Acceptance Criteria:**
- [ ] Leads with missing fields import as "needs review"
- [ ] Unknown counties import as "needs review"
- [ ] VAs can edit and mark as complete
- [ ] Status filter works
- [ ] Review notes show what's missing

---

#### TICKET-QA-006: Auto-Verify API Leads with Complete Data
**Priority:** Medium
**Effort:** 3-4 hours

**Current:** API leads always require manual verification
**Desired:** Auto-verify if all required fields present

**Logic:**
```typescript
// In importLeadsFromApi
for (const lead of leads) {
  // Check if all required form fields are present
  const hasAllRequired = checkRequiredFields(payload);

  if (hasAllRequired) {
    lead.verified = true;  // Auto-verify!
  }
}
```

**Required Fields for Auto-Verify:**
- form_multifamily
- form_repairs
- form_occupied
- form_sell_fast
- form_goal
- form_owner
- form_owned_years
- form_listed
- form_bedrooms
- form_bathrooms

**Acceptance Criteria:**
- [ ] API leads with all required fields auto-verify
- [ ] API leads with partial fields remain unverified
- [ ] CSV imports never auto-verify (always manual)

---

### Lead Table UI

#### TICKET-QA-007: Redesign Lead Table Action Columns
**Priority:** Medium
**Effort:** 4-5 hours

**Current:** Last 4 columns are buttons with text labels
**Desired:** Icon-only actions, no column headers, compact

**Columns to Convert:**
1. **Trash** → 🗑️ icon button (red on hover)
2. **Worker Enable** → 🤖 toggle switch or icon
3. **Verify** → ✓ icon button (green when verified)
4. **Send** → 📤 icon button

**Design:**
- Remove column headers for action columns
- Use MUI IconButton with tooltips
- Icons only, no text
- Compact spacing
- Color coding:
  - Trash: Gray → Red on hover
  - Worker: Gray (disabled) → Blue (enabled)
  - Verify: Gray → Green (verified)
  - Send: Gray → Blue on hover

**Implementation:**
```tsx
// Instead of:
<Button>Verify Lead</Button>

// Use:
<Tooltip title="Verify Lead">
  <IconButton onClick={handleVerify}>
    <CheckCircleIcon color={verified ? 'success' : 'disabled'} />
  </IconButton>
</Tooltip>
```

**Acceptance Criteria:**
- [ ] All action buttons converted to icons
- [ ] Tooltips show action name on hover
- [ ] No column headers for action columns
- [ ] Responsive layout maintains usability
- [ ] Color coding makes status clear

---

### Buyer Management

#### TICKET-QA-008: Add Active/Inactive Status to Buyers
**Priority:** High
**Effort:** 4-5 hours

**Requirements:**
- Add "active" boolean column to buyers table
- Add "Active" column to buyers table UI (green ✓ / red ✗)
- Add "Put on Hold" button in table row actions
- "On Hold" stops ALL activities:
  - Manual send blocked
  - Worker skips this buyer
  - Shows "⏸️ On Hold" badge

**Database:**
```sql
ALTER TABLE buyers ADD COLUMN active BOOLEAN DEFAULT true;
```

**UI - Buyers Table:**
- Column: "Status" → Shows "Active" (green) or "On Hold" (red)
- Action: IconButton "⏸️" → "Put on Hold" / "Activate"

**Backend Logic:**
```typescript
// In buyerDispatchService.canSendLeadToBuyer()
if (!buyer.active) {
  return { allowed: false, reason: "Buyer is on hold" };
}

// In workerService.processAllBuyers()
const activeBuyers = allBuyers.filter(b => b.active);
```

**Acceptance Criteria:**
- [ ] Can put buyer on hold via UI
- [ ] On-hold buyers skip in worker
- [ ] Manual send shows disabled with tooltip
- [ ] Status visible in table
- [ ] Can reactivate buyer

---

#### TICKET-QA-009: Improve Buyer Edit Modal UX
**Priority:** Medium
**Effort:** 3-4 hours

**Changes:**

1. **"Requires Validation" → Toggle Switch**
   - Currently: Checkbox
   - Desired: Toggle switch (MUI Switch component)

2. **Authorization Section → Collapsible with Toggle**
   - Toggle: "Requires Authorization" (default: off)
   - When ON: Show auth fields
   - When OFF: Hide auth fields

3. **Auth Type → Dropdown**
   - Currently: Text input (user types "Bearer", "API Key")
   - Desired: Select dropdown
   - Options:
     - "Bearer Token"
     - "API Key"
     - "Custom" (allows text input)

**Implementation:**
```tsx
<FormControlLabel
  control={<Switch checked={requiresAuth} onChange={handleAuthToggle} />}
  label="Requires Authorization"
/>

{requiresAuth && (
  <Collapse in={requiresAuth}>
    <Select value={authType} onChange={handleAuthTypeChange}>
      <MenuItem value="Bearer">Bearer Token</MenuItem>
      <MenuItem value="API Key">API Key</MenuItem>
      <MenuItem value="custom">Custom</MenuItem>
    </Select>
  </Collapse>
)}
```

**Acceptance Criteria:**
- [ ] Requires Validation is toggle switch
- [ ] Authorization section collapsible
- [ ] Auth type is dropdown
- [ ] No typing errors from manual input
- [ ] Form validation still works

---

#### TICKET-QA-012: Drag-and-Drop Buyer Priority Reordering ✅
**Priority:** Medium
**Effort:** 5-6 hours
**Status:** Complete
**PR:** #30
**Branch:** feature/ticket-qa-012-drag-drop-priority

**Current:** Priority is a number field in buyer edit modal, manual entry only
**Desired:** Drag-and-drop interface in buyers table to reorder priorities visually

**Use Case:**
- Admin wants to reorder buyer priority quickly without editing each buyer individually
- Drag handle (⋮⋮) on right side of each table row
- Click and hold to activate drag mode
- Drag up/down to change priority
- Backend updates ALL buyer priorities to maintain correct sequence

**UI - Buyers Table:**
```tsx
// Add drag handle column (rightmost)
<TableCell>
  <Tooltip title="Drag to reorder priority">
    <IconButton className="drag-handle">
      <DragIndicatorIcon />  {/* Three horizontal lines ⋮⋮ */}
    </IconButton>
  </Tooltip>
</TableCell>

// Implement with @dnd-kit/core and @dnd-kit/sortable
import { DndContext, closestCenter, PointerSensor, useSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (active.id !== over?.id) {
    const movedBuyer = buyers.find(b => b.id === active.id);
    const targetBuyer = buyers.find(b => b.id === over.id);

    // Only send the moved buyer's ID and new priority
    // Backend will calculate which other buyers need to shift
    await api.put('/api/buyers/reorder-priority', {
      buyerId: movedBuyer.id,
      oldPriority: movedBuyer.priority,
      newPriority: targetBuyer.priority
    });

    // Refresh the buyers list to show updated priorities
    await fetchBuyers();
  }
};
```

**Backend - New API Endpoint:**
```typescript
// In buyerResource.ts
this.router.put('/reorder-priority', async (req: Request, res: Response) => {
  try {
    const { buyerId, oldPriority, newPriority } = req.body;

    if (!buyerId || oldPriority == null || newPriority == null) {
      return res.status(400).json({
        error: 'buyerId, oldPriority, and newPriority required'
      });
    }

    await this.buyerService.reorderPriority(buyerId, oldPriority, newPriority);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error reordering priority:', error);
    res.status(500).json({
      error: 'Failed to reorder priority',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

**Backend - BuyerService Method:**
```typescript
// In buyerService.ts
async reorderPriority(
  buyerId: string,
  oldPriority: number,
  newPriority: number
): Promise<void> {
  return this.buyerDAO.reorderPriority(buyerId, oldPriority, newPriority);
}
```

**Backend - BuyerDAO Method:**
```typescript
// In buyerDAO.ts
async reorderPriority(
  buyerId: string,
  oldPriority: number,
  newPriority: number
): Promise<void> {
  // Backend calculates which buyers need to shift
  // Only updates affected buyers, not all 500!

  await this.db.tx(async t => {
    if (oldPriority === newPriority) {
      return; // No change needed
    }

    // Step 1: Temporarily set moved buyer to -1 to avoid UNIQUE constraint
    await t.none(
      'UPDATE buyers SET priority = -1 WHERE id = $1 AND deleted IS NULL',
      [buyerId]
    );

    if (oldPriority > newPriority) {
      // Moving UP (e.g., 5 → 2)
      // Shift DOWN all buyers in range [newPriority, oldPriority)
      // Buyers at 2,3,4 become 3,4,5
      await t.none(`
        UPDATE buyers
        SET priority = priority + 1, modified = NOW()
        WHERE priority >= $1
          AND priority < $2
          AND deleted IS NULL
      `, [newPriority, oldPriority]);
    } else {
      // Moving DOWN (e.g., 2 → 5)
      // Shift UP all buyers in range (oldPriority, newPriority]
      // Buyers at 3,4,5 become 2,3,4
      await t.none(`
        UPDATE buyers
        SET priority = priority - 1, modified = NOW()
        WHERE priority > $1
          AND priority <= $2
          AND deleted IS NULL
      `, [oldPriority, newPriority]);
    }

    // Step 3: Set moved buyer to new priority
    await t.none(
      'UPDATE buyers SET priority = $1, modified = NOW() WHERE id = $2 AND deleted IS NULL',
      [newPriority, buyerId]
    );
  });
}
```

**Database Consideration:**
- `buyers` table has `UNIQUE(priority, deleted)` constraint
- Backend-calculated approach: only updates affected buyers (not all 500!)
- Three-step transaction:
  1. Set moved buyer to temporary priority (-1) to release constraint
  2. Shift affected buyers in the range (increment or decrement)
  3. Set moved buyer to final priority
- Works with pagination: frontend only sends `{ buyerId, oldPriority, newPriority }`
- Backend determines which other buyers need to shift based on direction:
  - Moving UP (5→2): Shift DOWN buyers at positions 2,3,4
  - Moving DOWN (2→5): Shift UP buyers at positions 3,4,5

**Frontend Dependencies:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Acceptance Criteria:**
- [x] Drag handle (⋮⋮) appears on right side of buyers table
- [x] Click and hold activates drag mode
- [x] Can drag rows up/down to reorder
- [x] Visual feedback during drag (row opacity, position indicator)
- [x] Backend calculates which buyers to shift (only affected range, not all buyers)
- [x] Works with pagination (doesn't require all buyer IDs from frontend)
- [x] Priority column updates immediately after successful save
- [x] Error handling shows if reorder fails
- [x] Does not conflict with UNIQUE(priority) constraint
- [x] Works with existing buyer filters/sorting
- [x] Transaction ensures atomic update (all or nothing)
- [x] **BONUS:** Manual priority edit also uses smart reordering

**Edge Cases:**
- Handle drag on filtered/sorted table (warn or disable sorting during drag)
- Handle concurrent updates from multiple admins
- Validate all priorities are unique sequential integers (1, 2, 3...)

---

### Future Tickets (Mentioned, Not Detailed)

#### TICKET-QA-010: User Management & Roles System
**Priority:** High (Future)
**Status:** Needs detailed requirements

**Mentioned Features:**
- User authentication
- Role-based access control
- VA role vs Admin role

**Status:** User to provide detailed requirements

---

#### TICKET-QA-011: Lead UI Major Redesign
**Priority:** High (Future)
**Status:** Needs detailed requirements

**Mentioned:**
- "Where we work the most"
- Needs significant UX improvements
- Details TBD

**Status:** User to provide detailed requirements

---

## 📊 QA Session Summary

**Total New Tickets:** 12
**Completed:** 1 ticket (QA-012)
**High Priority:** 6 tickets
**Medium Priority:** 4 tickets (1 complete)
**Future/TBD:** 2 tickets

**Immediate Action Items:**
1. TICKET-QA-001: Remove Campaigns from navbar ✅ Quick win
2. TICKET-QA-002: Remove Affiliates from navbar ✅ Quick win
3. TICKET-QA-003: County-Buyer filtering 🔴 Complex, high value
4. TICKET-QA-005: Needs Review status 🔴 Complex, high value
5. TICKET-QA-008: Buyer active/inactive 🔴 Important for ops

**Notes:**
- Dispatch mode "Worker/Manual" display already working (user confirmed)
- Focus on county/campaign filtering as highest priority
- "Needs Review" status will significantly improve VA workflow

---

**Session Date:** 2026-03-02
**Status:** QA findings documented, ready for ticket prioritization
**Next Step:** User prioritizes which tickets to implement first
