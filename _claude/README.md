# 📁 _claude/ - Claude Code Extended Memory

This folder provides **extended memory and context** for Claude Code across sessions. It ensures continuity, prevents repeated work, and maintains project knowledge.

**🎓 NEW TO THIS FOLDER? Read `HOW_TO_USE.md` first!**

---

## 📂 Folder Structure

```
_claude/
├── README.md (this file)
├── HOW_TO_USE.md ⭐ (TUTORIAL - Read this first!)
├── session/
│   └── WORK_SESSION.md (active session tracker)
├── planning/ ⭐ (PRIMARY LOCATION for all docs)
│   ├── README.md (project overview)
│   ├── 00_EXECUTIVE_SUMMARY.md
│   ├── 01_IMPACT_ANALYSIS.md
│   ├── 02_DATABASE_MIGRATION_STRATEGY.md
│   ├── 03_SERVICE_REFACTOR_PLAN.md
│   ├── 04_WORKER_REFACTOR.md
│   ├── 05_VENDOR_ABSTRACTION.md
│   ├── 06_LOGGING_STRATEGY.md
│   ├── 07_RISK_ANALYSIS.md
│   ├── 08_TICKETS.md (all 41 tickets)
│   ├── 09_IMPLEMENTATION_ORDER.md
│   ├── 10_RECOMMENDATIONS.md
│   ├── CURRENT_SPRINT.md ⭐ (UPDATE THIS AFTER EVERY SESSION!)
│   └── FUTURE_ENHANCEMENTS.md (backlog of new ideas)
├── context/
│   └── BEHAVIORAL_CONTEXT.md (interaction rules)
└── archive/
    └── onboarding/ (ChatGPT analysis files)
```

---

## 🎯 Purpose of Each Folder

### **session/**
**Active work tracking** - Updated continuously during implementation.

- `WORK_SESSION.md` - Current status, completed tickets, issues, environment state
- Read this file EVERY TIME you resume work
- Update after EVERY ticket completion

### **planning/**
**Implementation roadmap & active sprint tracking** - Primary location for all project documentation.

**REFERENCE DOCS (READ-ONLY):**
- Numbered docs (00-10): Architecture, migration strategies, risk analysis
- `08_TICKETS.md`: All 41 tickets with acceptance criteria
- `README.md`: Project overview

**LIVING DOCS (UPDATE THESE!):**
- ⭐ `CURRENT_SPRINT.md`: **UPDATE AFTER EVERY WORK SESSION**
- ⭐ `FUTURE_ENHANCEMENTS.md`: Add user's future feature ideas here

### **context/**
**Behavioral guidelines** - How Claude Code should interact with the user.

- `BEHAVIORAL_CONTEXT.md` - Interaction rules, when to ask vs act, anti-patterns
- Read this at the start of each session to understand expected behavior

### **archive/**
**Historical context** - Old documentation, no longer actively used.

- Onboarding files created for ChatGPT upload
- Superseded planning documents

---

## 🚀 Quick Start (New Session)

### First Time Using This Folder?
**Read `HOW_TO_USE.md` - Complete tutorial with workflows, templates, and best practices.**

### Starting a Work Session

1. **Read current sprint status**:
   ```
   Read _claude/planning/CURRENT_SPRINT.md
   ```

2. **Check planning context** (if needed):
   ```
   Read _claude/planning/README.md
   Read _claude/planning/08_TICKETS.md
   ```

3. **Start working**:
   - Ask user what they want to work on
   - Reference tickets from `08_TICKETS.md` if applicable
   - Document work in `CURRENT_SPRINT.md` as you go

**Or just ask the user**:
```
"What should we work on today?"
```

Then check `CURRENT_SPRINT.md` to understand what was previously completed.

---

## 📝 File Update Frequency

| File | Update Frequency |
|------|------------------|
| `session/WORK_SESSION.md` | After EVERY ticket |
| `context/BEHAVIORAL_CONTEXT.md` | When interaction patterns change |
| `planning/*.md` | Rarely (only if plan changes) |
| `archive/*` | Never (historical only) |

---

## 🔒 Git Ignore Status

This folder is **NOT in .gitignore**.

**Why**: We want to track implementation progress in version control.

**What gets committed**:
- ✅ Session state (WORK_SESSION.md)
- ✅ Planning documents
- ✅ Behavioral context
- ✅ Archive files

---

## 🎬 Example Session Flow

```bash
# User starts session
User: "Read the work session and continue"

# Claude loads context
Claude:
  - Reads BEHAVIORAL_CONTEXT.md (knows how to behave)
  - Reads WORK_SESSION.md (knows current state)
  - Summarizes: "We're on TICKET-005, last completed was #004"
  - Starts working on next ticket

# After completing ticket
Claude:
  - Updates WORK_SESSION.md with completion
  - Logs any issues encountered
  - Commits changes
  - Moves to next ticket

# User ends session
User: "Going to bed, update the session"

# Claude saves state
Claude:
  - Updates WORK_SESSION.md with final state
  - Notes blockers for next session
  - Summarizes progress
```

---

**Last Updated**: 2024-02-27 11:30 PM PST
**Status**: Active Implementation
