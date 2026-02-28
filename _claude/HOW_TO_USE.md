# How to Use the `_claude/` Folder

**Purpose:** This folder provides extended memory and context for Claude Code sessions. It acts as a persistent knowledge base across conversations, ensuring continuity and preventing repeated work.

---

## Quick Start

### When Starting a New Session

1. **Read `CLAUDE.md`** (in project root) - This points you here
2. **Read `_claude/context/BEHAVIORAL_CONTEXT.md`** - Learn core behavior (TICKET MANAGEMENT!)
3. **Read `_claude/planning/README.md`** - Get current project state
4. **Check `_claude/planning/CURRENT_SPRINT.md`** - See what's being worked on
5. **Scan `_claude/planning/08_TICKETS.md`** - Understand all planned tickets

### When the User Asks You to Do Work

1. **Check if it's already a ticket** in `08_TICKETS.md`
   - If yes → Reference the ticket number and follow acceptance criteria
   - If no → It's new work, document it in `CURRENT_SPRINT.md` or `FUTURE_ENHANCEMENTS.md`

2. **Before implementing:**
   - Check `_claude/planning/` for architectural guidance
   - Review related tickets to understand dependencies
   - Ask user if this is part of current sprint or future work

3. **After completing work:**
   - Update `CURRENT_SPRINT.md` with what was done
   - Mark tickets as complete if applicable
   - Document any future work in `FUTURE_ENHANCEMENTS.md`

---

## Folder Structure

```
_claude/
├── HOW_TO_USE.md           ← You are here
├── README.md               ← Overview of this folder's purpose
├── planning/               ← PRIMARY LOCATION for all planning docs
│   ├── README.md                    ← Start here for project overview
│   ├── 00_EXECUTIVE_SUMMARY.md      ← High-level refactor plan
│   ├── 01_IMPACT_ANALYSIS.md        ← Files/modules affected
│   ├── 02_DATABASE_MIGRATION_STRATEGY.md
│   ├── 03_SERVICE_REFACTOR_PLAN.md
│   ├── 04_WORKER_REFACTOR.md
│   ├── 05_VENDOR_ABSTRACTION.md
│   ├── 06_LOGGING_STRATEGY.md
│   ├── 07_RISK_ANALYSIS.md
│   ├── 08_TICKETS.md               ← ALL 41 tickets (numbered, structured)
│   ├── 09_IMPLEMENTATION_ORDER.md  ← Sprint breakdown
│   ├── 10_RECOMMENDATIONS.md       ← Testing, monitoring, rollback
│   ├── CURRENT_SPRINT.md           ← Active sprint work (UPDATE THIS!)
│   └── FUTURE_ENHANCEMENTS.md      ← Backlog of new ideas
├── context/                ← Reference materials, decisions
├── archive/                ← Completed work, old decisions
└── session/                ← Temporary notes (session-specific)
```

---

## File Purposes

### `_claude/planning/`

#### Core Planning Documents (00-10)

**These are READ-ONLY reference docs** from the initial refactor planning. They document the buyers refactor architecture:

| File | Purpose | When to Read |
|------|---------|--------------|
| `00_EXECUTIVE_SUMMARY.md` | Timeline, key changes, two-lane dispatch model | Starting new work related to buyers |
| `01_IMPACT_ANALYSIS.md` | All affected files/modules/tables | Understanding scope of refactor |
| `02_DATABASE_MIGRATION_STRATEGY.md` | 5-stage migration path with SQL | Database changes needed |
| `03_SERVICE_REFACTOR_PLAN.md` | Service layer changes | Refactoring services |
| `04_WORKER_REFACTOR.md` | Worker automation changes | Working on worker/scheduler |
| `05_VENDOR_ABSTRACTION.md` | Multi-vendor webhook adapter | Adding new buyers/vendors |
| `06_LOGGING_STRATEGY.md` | send_log reuse strategy | Working with send logs |
| `07_RISK_ANALYSIS.md` | 18 risks with mitigations | Before major changes |
| `09_IMPLEMENTATION_ORDER.md` | 6-sprint breakdown | Sprint planning |
| `10_RECOMMENDATIONS.md` | Testing, monitoring, docs | Before deployment |

#### Active Documents (UPDATE THESE!)

**These are LIVING documents you should update:**

| File | Purpose | When to Update |
|------|---------|----------------|
| `08_TICKETS.md` | All tickets with acceptance criteria | When adding new tickets to the refactor plan |
| `CURRENT_SPRINT.md` | Active sprint work and completed tasks | **AFTER EVERY WORK SESSION** |
| `FUTURE_ENHANCEMENTS.md` | Backlog of UI/UX improvements | When user mentions future work |

---

## Workflows

### Workflow 1: Starting a New Session

```
1. Read CLAUDE.md (project root)
   ↓
2. Read _claude/planning/README.md
   ↓
3. Read _claude/planning/CURRENT_SPRINT.md
   ↓
4. Understand current project state
   ↓
5. Ask user what they want to work on
```

---

### Workflow 2: User Asks for a Feature

```
1. Check _claude/planning/08_TICKETS.md
   ├── Found? → Reference ticket #, follow acceptance criteria
   └── Not found? → Ask: "Is this for current sprint or future?"
       ↓
2. If current sprint:
   - Implement feature
   - Document in CURRENT_SPRINT.md
   ↓
3. If future work:
   - Add to FUTURE_ENHANCEMENTS.md
   - Estimate effort
```

---

### Workflow 3: Completing Work

```
After completing ANY work:

1. Update _claude/planning/CURRENT_SPRINT.md
   - Add new section describing what was done
   - List files changed
   - Document testing performed
   ↓
2. If related to a ticket in 08_TICKETS.md:
   - Mark ticket as complete
   - Reference ticket # in CURRENT_SPRINT.md
   ↓
3. If user mentions future improvements:
   - Add to FUTURE_ENHANCEMENTS.md
   - Prioritize (High/Medium/Low)
   - Estimate effort (hours)
```

---

### Workflow 4: Bug Fixes (TICKET-DRIVEN!)

```
Bug found:

1. CREATE TICKET FIRST!
   - Add to 08_TICKETS.md or FUTURE_ENHANCEMENTS.md
   - Document: What's broken, expected behavior, steps to reproduce
   ↓
2. Fix the bug
   - Reference ticket # in commit: "fix: description (TICKET-XXX)"
   ↓
3. Mark ticket complete:
   - Update 08_TICKETS.md status
   - Document in CURRENT_SPRINT.md:
     - Problem
     - Solution
     - Files changed
     - Testing
   ↓
4. If it reveals systemic issue:
   - Create NEW ticket for broader fix
   - Add to FUTURE_ENHANCEMENTS.md
```

**NEVER fix bugs without a ticket!**

---

### Workflow 5: Finding a Blocker

```
Blocked on something:

1. Document blocker in current ticket
   - What's blocking
   - What you tried
   - What's needed to unblock
   ↓
2. Update CURRENT_SPRINT.md:
   - Mark ticket as BLOCKED
   - Explain blocker
   ↓
3. If workaround needed:
   - Create NEW ticket for proper fix
   - Implement workaround
   - Reference both tickets in commit
   ↓
4. Ask user for direction
```

**NEVER leave blockers undocumented!**

---

## Common Mistakes to Avoid

### ❌ DON'T: Create files in `docs/AI/`
**Reason:** That's legacy documentation. Use `_claude/planning/` instead.

**Correct:**
- ✅ `_claude/planning/CURRENT_SPRINT.md`
- ✅ `_claude/planning/FUTURE_ENHANCEMENTS.md`

**Incorrect:**
- ❌ `docs/AI/PR_SUMMARIES/...`
- ❌ `docs/AI/FUTURE_TICKETS.md`

---

### ❌ DON'T: Forget to update `CURRENT_SPRINT.md`
**Reason:** This is the memory across sessions. If you don't document your work, it's lost.

**Always update after:**
- Implementing a feature
- Fixing a bug
- Making architectural decisions
- Completing a ticket

---

### ❌ DON'T: Modify numbered planning docs (00-10)
**Reason:** These are reference architecture from initial planning. They're READ-ONLY.

**Instead:**
- Document deviations in `CURRENT_SPRINT.md`
- Add new decisions to session notes
- Update `FUTURE_ENHANCEMENTS.md` for new ideas

---

### ❌ DON'T: Skip reading context at session start
**Reason:** You'll repeat work or miss important decisions.

**Always read:**
1. `_claude/planning/README.md`
2. `_claude/planning/CURRENT_SPRINT.md`
3. Relevant numbered docs if working on related area

---

## Update Checklist

### After EVERY Work Session

- [ ] Updated `_claude/planning/CURRENT_SPRINT.md` with:
  - What was completed
  - Files changed
  - Testing performed
  - Any known limitations

- [ ] If user mentioned future work:
  - [ ] Added to `_claude/planning/FUTURE_ENHANCEMENTS.md`
  - [ ] Prioritized (High/Medium/Low)
  - [ ] Estimated effort

- [ ] If completed a ticket:
  - [ ] Marked as complete in `08_TICKETS.md` (if applicable)

---

## Template: Adding Work to CURRENT_SPRINT.md

```markdown
### Feature/Bug: [Short Title]
**Priority:** P0/P1/P2
**Actual Time:** X hours

**Problem:**
[What was broken or requested]

**Solution:**
[What was implemented]

**Files Changed:**
- `file1.ts` - [what changed]
- `file2.tsx` - [what changed]

**Testing:**
- ✅ Test case 1
- ✅ Test case 2

---
```

---

## Template: Adding to FUTURE_ENHANCEMENTS.md

```markdown
### [Enhancement Number]. [Short Title]
**Priority:** High/Medium/Low
**Effort:** X-Y hours

**Current:** [Current behavior]
**Desired:** [Desired behavior]

**Implementation:**
[Brief notes on how to implement]

**Files:** [List of files to change]

---
```

---

## FAQ

### Q: Where do I document today's work?
**A:** `_claude/planning/CURRENT_SPRINT.md`

### Q: Where do I add future feature ideas?
**A:** `_claude/planning/FUTURE_ENHANCEMENTS.md`

### Q: Where do I find the original refactor plan?
**A:** `_claude/planning/README.md` and numbered docs (00-10)

### Q: Where are all the tickets?
**A:** `_claude/planning/08_TICKETS.md` (41 tickets total)

### Q: Should I update numbered docs (00-10)?
**A:** No, they're READ-ONLY reference. Document changes in `CURRENT_SPRINT.md`

### Q: What about `docs/AI/`?
**A:** Legacy folder. May be outdated. Always prefer `_claude/planning/`

### Q: How do I know what sprint we're on?
**A:** Check `CURRENT_SPRINT.md` and `08_TICKETS.md` for status

### Q: Where do I put session-specific notes?
**A:** `_claude/session/` for temporary working files

---

## Best Practices

### 1. **Always Start with Context**
Read `CURRENT_SPRINT.md` before asking the user what to work on.

### 2. **Document as You Go**
Don't wait until the end. Update `CURRENT_SPRINT.md` incrementally.

### 3. **Link Related Work**
Reference ticket numbers, file paths, and related docs.

### 4. **Be Specific**
"Fixed buyer settings bug" ❌
"Fixed buyerDAO missing fields in create() query causing settings not to persist" ✅

### 5. **Estimate Realistically**
Track actual time vs estimated time to improve future estimates.

### 6. **Separate Current vs Future**
- Current sprint work → `CURRENT_SPRINT.md`
- Future ideas → `FUTURE_ENHANCEMENTS.md`

---

## Summary

**Primary Rule:** `_claude/planning/` is your extended memory. Use it.

**Key Files to Know:**
1. `CURRENT_SPRINT.md` - What's being worked on NOW (update after every session)
2. `FUTURE_ENHANCEMENTS.md` - What's coming later (add user's ideas here)
3. `08_TICKETS.md` - All planned tickets (reference when working on tickets)
4. Numbered docs (00-10) - Architecture reference (read-only)

**Golden Rule:**
> If you don't document it in `CURRENT_SPRINT.md`, it didn't happen.

---

**Questions?** Ask the user. This folder structure is designed to prevent context loss across sessions.

**Last Updated:** 2026-02-28
**Maintained By:** Claude Sonnet 4.5
