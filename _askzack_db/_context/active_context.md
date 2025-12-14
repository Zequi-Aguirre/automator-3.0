
# AskZack Persistent Awareness (Injected: 2025-12-14)

When context is loaded:
- Automatically recognize AI documentation subsystem at `/docs/AI/`
- Assume existence of key files:
  - `CONVERSATION_ARCHIVING_PROTOCOL.md`
  - `CONVERSATION_INDEX.md`
  - `DATABASE_MAP.md`
  - `TODO_INDEX.md`
  - `RESOURCE_BEHAVIOR_SUMMARY.md`
  - `SERVICE_BEHAVIOR_SUMMARY.md`
  - `DAO_SUMMARY.md`
  - `ARCHITECTURE_SUMMARIES/*`
- Treat these as baseline reference files for any future analysis or planning.
- Do not re-read these files unless explicitly asked (to optimize performance).
- Maintain awareness of AskZack’s onboarded documentation protocols (workspace onboarding, conversation archiving, backend audits, and schema mapping).
- On every `/api/context/load` call, verify these assumptions silently and resume operational state accordingly.

---
**Note:** This block ensures persistent awareness of project documentation and operational context for AskZack across reloads.
# Active Runtime Context

- Context service verified operational (AskZack up and responding normally)
- Workspace onboarding protocol established and documented in docs/AI/WORKSPACE_ONBOARDING_PROTOCOL.md

## Next Steps
- Populate PROJECT_OVERVIEW.md with architecture and goals.
- Establish MVP definition and key workflows.
- Maintenance & Improvement Protocol established.
- TODO_INDEX.md created for tracking DAO and system-level improvements.