# Ticket Template

Use this template when creating work tickets for Automator 2.0.

---

## [TICKET-###] Title

**Type**: `[Feature | Bug | Refactor | Hotfix | Documentation]`

**Priority**: `[P0-Critical | P1-High | P2-Medium | P3-Low]`

**Epic/Area**: `[Lead Management | Worker/Automation | Admin UI | Multi-Vendor | Database | Auth]`

---

### Problem Statement

**Current Behavior**:
- Describe what currently happens (if bug)
- Describe what's missing (if feature)

**Expected Behavior**:
- What should happen instead
- Business justification (why this matters)

**Affected Users**:
- [ ] Admins
- [ ] Regular users
- [ ] External API consumers
- [ ] Worker/automation system

---

### Acceptance Criteria

- [ ] Criterion 1 (testable, specific)
- [ ] Criterion 2
- [ ] Criterion 3

**Definition of Done**:
- [ ] Code written and tested locally
- [ ] Migrations created (if DB changes)
- [ ] Linting passes (`npm run lint`)
- [ ] Manual testing completed (see test plan below)
- [ ] Documentation updated (if needed)
- [ ] PR reviewed and merged

---

### Technical Context

**Files Likely Affected**:
```
server/src/main/
├── data/<entity>DAO.ts         # If DB changes
├── services/<entity>Service.ts  # If business logic
├── resources/<entity>Resource.ts # If API changes
└── types/<entity>Types.ts       # If types change

client/src/
├── components/<area>/           # If UI changes
├── services/<api>Service.ts     # If API calls change
└── views/<role>Views/           # If pages change

postgres/migrations/
└── YYYYMMDDHHMMSS.do._<description>.sql  # If schema changes
```

**Dependencies**:
- Blocked by: `<TICKET-###>` (if applicable)
- Blocks: `<TICKET-###>` (if applicable)
- Related: `<TICKET-###>` (if applicable)

**Database Changes**:
- [ ] Schema changes required → create migration
- [ ] Data migration required → backfill script needed
- [ ] Indexes needed for performance

**External Systems Affected**:
- [ ] iSpeedToLead vendor integration
- [ ] Doppler configuration
- [ ] PostgreSQL schema

---

### Implementation Plan

**Step 1**: <Description>
- Files: `<list files>`
- Changes: `<summary>`

**Step 2**: <Description>
- Files: `<list files>`
- Changes: `<summary>`

**Step 3**: <Description>
- Files: `<list files>`
- Changes: `<summary>`

**Architecture Decision**:
- [ ] Follows DAO contract (no HTTP imports in DAOs)
- [ ] Follows service pattern (entity vs orchestrator)
- [ ] Follows resource contract (HTTP → service → response)
- [ ] Uses tsyringe DI
- [ ] Soft-delete pattern maintained

---

### Test Plan

**Unit Tests** (if adding tests):
```bash
# Test file: server/src/__tests__/<entity>.test.ts
npm test -- <entity>.test.ts
```

**Manual Testing**:

1. **Setup**:
   ```bash
   npm run dev-db-reset  # Fresh DB
   npm run dev-be        # Start backend
   npm run dev-fe        # Start frontend
   ```

2. **Test Case 1**: <Description>
   - **Steps**:
     1. Step 1
     2. Step 2
   - **Expected**: <outcome>
   - **Verify**: `SELECT ... FROM ...` (if DB check)

3. **Test Case 2**: <Description>
   - **Steps**:
     1. Step 1
     2. Step 2
   - **Expected**: <outcome>

**API Testing** (if API changes):
```bash
# Example curl command
curl -X POST http://localhost:5005/api/<endpoint> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

**Database Verification**:
```sql
-- Check data after changes
SELECT * FROM <table> WHERE <condition>;

-- Check constraints/indexes
\d <table_name>
```

---

### Risks & Considerations

**Performance**:
- [ ] Query optimization needed (index, pagination)
- [ ] Memory impact if loading large datasets
- [ ] API response time < 500ms

**Backward Compatibility**:
- [ ] Breaking API changes (coordinate with consumers)
- [ ] Migration requires downtime
- [ ] Data loss risk (backup before migration)

**Security**:
- [ ] Auth required for new endpoints
- [ ] Input validation/sanitization
- [ ] SQL injection prevention (use parameterized queries)

**Rollback Plan**:
- If bug in production: `<steps to revert>`
- If migration fails: `<steps to undo>`

---

### Deployment Notes

**Pre-deploy**:
```bash
# Run in staging first
doppler run -c staging --scope automator -- npm run db-migrate
doppler run -c staging --scope automator -- npm run build
```

**Deploy**:
```bash
# Production deployment
doppler run -c prod --scope automator -- npm run db-migrate
doppler run -c prod --scope automator -- npm run build
doppler run -c prod --scope automator -- npm run start-be
```

**Post-deploy Verification**:
- [ ] Check server logs for errors
- [ ] Test endpoint: `curl http://<prod-url>/api/<endpoint>`
- [ ] Verify worker running (if worker changes)
- [ ] Check send_log table (if lead dispatch changes)

**Monitoring** (first 24h):
- Watch error logs
- Check lead send success rate
- Monitor API response times

---

### Documentation Updates

- [ ] Update `CLAUDE.md` (if architecture changes)
- [ ] Update `docs/AI/` (if major feature)
- [ ] Update API docs (if endpoints change)
- [ ] Update README (if setup changes)

---

### Example Ticket

**[TICKET-042] Add Multi-County Blacklist UI**

**Type**: Feature

**Priority**: P2-Medium

**Epic/Area**: Admin UI

**Problem Statement**:
- **Current**: Admins can only blacklist counties one-by-one via table row actions
- **Expected**: Admins should bulk-select counties and blacklist in one action
- **Why**: Faster onboarding when affiliates provide list of 20+ excluded counties

**Acceptance Criteria**:
- [ ] County table has checkboxes for multi-select
- [ ] "Blacklist Selected" button appears when ≥1 county selected
- [ ] Clicking button blacklists all selected counties
- [ ] Table refreshes to show blacklisted=true
- [ ] Toast notification shows success/failure

**Files Affected**:
```
client/src/components/admin/adminCountiesSection/adminCountiesTable/
├── AdminCountiesTable.tsx         # Add checkboxes, bulk action button
└── useCountyBulkActions.ts        # New hook for bulk logic

client/src/services/countyService.ts  # Add bulkBlacklist() API call

server/src/main/resources/countyResource.ts   # Add PUT /api/counties/bulk-blacklist
server/src/main/services/countyService.ts     # Add bulkBlacklist() method
server/src/main/data/countyDAO.ts             # Add bulkUpdateBlacklist() query
```

**Implementation**:
1. Add `bulkUpdateBlacklist(ids: string[], blacklisted: boolean)` to CountyDAO
2. Add `bulkBlacklist(ids: string[])` to CountyService (calls DAO)
3. Add `PUT /api/counties/bulk-blacklist` route (parses `{ ids: string[] }`)
4. Add `bulkBlacklist(ids)` to client countyService.ts
5. Update AdminCountiesTable: checkboxes, selected state, bulk button
6. Show toast on success/error

**Test Plan**:
1. Login as admin → Counties page
2. Select 3 counties (checkboxes checked)
3. Click "Blacklist Selected"
4. Verify toast: "3 counties blacklisted"
5. Verify DB: `SELECT name, blacklisted FROM counties WHERE id IN (...)`
6. Verify leads with those counties now trash on import

**Risks**: None (UI-only, no migration)
