# 🧠 AskZack Conversation Archiving Protocol (v1.0)

### **Purpose**
This protocol defines how to **record, organize, and retrieve important AskZack (ChatGPT) conversations** directly within the project repository.

It ensures that every relevant discussion—covering audits, architecture changes, strategies, or technical decisions—is stored persistently and linked to code or documentation for future reference.

---

### **Folder Structure**
```
/docs/AI/
 ├── /ARCHITECTURE_SUMMARIES/          # e.g. SERVICE_BEHAVIOR_SUMMARY.md
 ├── /TODO_TRACKING/                    # e.g. TODO_INDEX.md
 ├── /CONVERSATIONS/                    # Archived AskZack conversations
 │    ├── /{ProjectName}/
 │    │    ├── {Topic}_{Date}.md
 │    │    └── ...
 │    └── CONVERSATION_INDEX.md
 └── CONVERSATION_ARCHIVING_PROTOCOL.md
```

---

---

### 🏷️ **Conversation Naming in ChatGPT**
When naming a conversation inside ChatGPT, use the same identifier format to keep the session aligned with its archived record.

**Format:**
```
ASKZACK:CONV:{ProjectName}:{Topic}:{Date}
```

**Example:**
```
ASKZACK:CONV:Automator:Backend_Audit_and_Archiving_Protocol:2025-12-14
```
ASKZACK:CONV:{ProjectName}:{Topic}:{Date}
```
**Example:**
```
ASKZACK:CONV:Automator:Backend_Audit_and_Archiving_Protocol:2025-12-14
```

This ID is stored at the top of every conversation archive file and used in the global index for quick search and cross-referencing.

---

### **File Contents (Markdown Template)**
Each conversation archive includes:
- Conversation ID (standardized name)
- Date & Participants
- Summary of key points
- Major decisions or insights
- TODOs created or updated during the chat
- Related file/document links

---

### **Automation Goal (future)**
1. AskZack auto-creates the conversation archive file at the end of relevant sessions.
2. Automatically updates `/CONVERSATION_INDEX.md` with metadata (title, date, tags).
3. Optionally cross-links the conversation to TODO or SUMMARY files.

---

### **Versioning**
- **v1.0:** Manual archival (current phase)
- **v2.0:** Semi-automated tagging and indexing
- **v3.0:** Full AI-assisted conversation auto-sync with repo context

---

**Maintained by:** AskZack Automation Core  
**Last updated:** 2025-12-14  
**Status:** Active and in use