# AskZack Service Behavior Summary (v1)

This document captures the *functional behavior* of each service in the AskZack backend.  
It complements `SERVICES_MAP.md`, which lists structure and dependencies, by describing *how* each service operates and interacts with others.

---

## 🧩 leadService.ts

### **Purpose**
The `LeadService` manages the complete lifecycle of leads:
- Creation and import (CSV ingestion)
- Verification and validation
- Dispatching leads to vendors
- Handling cooldowns, blacklists, and whitelists
- Logging and cleanup after dispatch

It is the *central orchestrator* of the automation engine.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `leadDAO` | Core persistence and lifecycle management |
| DAO | `leadFormInputDAO` | Store form field data |
| DAO | `sendLogDAO` | Log vendor dispatch attempts |
| DAO | `workerSettingsDAO` | Retrieve delays, cooldowns, and worker config |
| Service | `countyService` | County whitelist/blacklist logic |
| Service | `campaignService` | Campaign association and status management |
| Service | `affiliateService` | Affiliate blacklist/rating control |
| Service | `investorService` | Investor cooldown and preference logic |
| Service | `vendorReceiveService` | Used in dev mode for safe vendor logging |
| Vendor API | `iSpeedToLeadIAO` | External vendor integration (production only) |

---

### **Core Functions**

#### `sendLead(leadId)`
Main execution function that sends a lead to a vendor or stores it locally in dev mode.

1. Validates that the lead exists, is verified, and not previously sent.
2. Loads associated campaign, affiliate, investor, and county.
3. Constructs a payload (with `leadFormInputDAO` data).
4. Logs the attempt via `sendLogDAO.createLog()`.
5. **Vendor Dispatch Behavior:**
   ```ts
   if (process.env.NODE_ENV !== 'production') {
     await vendorReceiveDAO.create(payload);
     return this.leadDAO.markLeadAsSent(lead.id);
   } else {
     await iSpeedToLeadIAO.sendLead(payload);
   }
   ```
6. Parses vendor response and updates send log + lead status.
7. Applies whitelist or cooldown logic for county/investor reuse.

✅ Enforces safety and consistency through DAO-level soft deletes and updates.

---

#### `verifyLead(leadId)`
Marks a lead as verified if all required fields are filled.  
- Prevents already-sent or deleted leads from being verified.  
- Used during import and worker approval processes.

---

#### `importLeads(file)`
Processes CSV files for bulk lead ingestion.  
- Parses CSV into normalized lead objects.  
- Uses rules from `workerSettingsDAO` to determine cooldowns and lead delays.  
- Validates against all blacklist/whitelist sources (county, affiliate, investor, campaign).  
- Trashes invalid or duplicate leads using `leadDAO.trashLeadWithReason()`.  
- Inserts valid leads in bulk.  

🧩 Note: Currently uses sequential inserts — should be optimized to batch insert for performance.

---

#### `trashLead(leadId, reason)`
Soft-deletes a lead and adds an explanatory reason.  
Used for expired leads, blacklist triggers, or duplicates.

---

### **Key Business Rules**
- **Soft-delete enforcement:** Leads are never permanently removed.
- **Blacklist logic:** If any linked entity (affiliate, investor, campaign, county) is blacklisted, the lead is trashed immediately.
- **Cooldown logic:** Prevents sending multiple leads from the same county/investor within a configured time range.
- **Whitelist logic:** Overrides cooldowns, but whitelist entries are consumed after one use.
- **Worker timing:** `workerSettingsDAO` defines when leads are eligible for send.

---

### **Known Gaps / TODOs**
- Missing environment check before vendor send (✅ added to TODO index).
- No retry or backoff mechanism for failed sends.
- Timeout and error types not distinguished.
- No transactional protection for duplicate dispatches.
- Needs batch insert support in imports.
- Requires unified error logging with context (lead ID, vendor).

---

### **Impact on Vendor Safety**
The `sendLead()` method is the primary enforcement point for the vendor-safe behavior described in `LOCAL_DEV_BEHAVIOR.md`.  
All external network calls must pass through this check to prevent accidental spam during development or staging.

---

### **Cross-Service Interactions**
```
LeadService
 ├─ CountyService → County validation
 ├─ AffiliateService → Blacklist enforcement
 ├─ CampaignService → Context lookup
 ├─ InvestorService → Cooldown management
 ├─ SendLogService → Dispatch log persistence
 └─ VendorReceiveService → Dev-mode redirection
```

---

### **Update Policy**
Whenever dispatch logic, environment routing, or cooldown rules change, this section must be updated.  
It serves as the source of truth for the automation behavior of lead dispatch.