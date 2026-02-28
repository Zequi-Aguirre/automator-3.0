# 📁 _claude/ - Claude Code Context Folder

This folder contains all context files for Claude Code to understand the project, track progress, and maintain consistent behavior across sessions.

---

## 📂 Folder Structure

```
_claude/
├── README.md (this file)
├── session/
│   └── WORK_SESSION.md (active session tracker)
├── planning/
│   ├── 00_EXECUTIVE_SUMMARY.md
│   ├── 01_IMPACT_ANALYSIS.md
│   ├── 02_DATABASE_MIGRATION_STRATEGY.md
│   ├── 03_SERVICE_REFACTOR_PLAN.md
│   ├── 04_WORKER_REFACTOR.md
│   ├── 05_VENDOR_ABSTRACTION.md
│   ├── 06_LOGGING_STRATEGY.md
│   ├── 07_RISK_ANALYSIS.md
│   ├── 08_TICKETS.md (all 40 tickets)
│   ├── 09_IMPLEMENTATION_ORDER.md
│   ├── 10_RECOMMENDATIONS.md
│   └── README.md
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
**Implementation roadmap** - Created during planning, reference during implementation.

- Complete refactor plan with all tickets
- Database migration strategies
- Service architecture patterns
- Risk analysis
- Implementation order

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

When starting a new work session:

1. **Read behavioral context first**:
   ```
   Read _claude/context/BEHAVIORAL_CONTEXT.md
   ```

2. **Then read work session**:
   ```
   Read _claude/session/WORK_SESSION.md
   ```

3. **Start working**:
   ```
   Continue with next ticket
   ```

**Or just say**:
```
"Read the work session and continue"
```

This will automatically load both behavioral context and work session.

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
