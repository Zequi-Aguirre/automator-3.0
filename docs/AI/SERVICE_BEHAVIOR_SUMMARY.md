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


---

## 🧩 sendLogService.ts

### **Purpose**
The `SendLogService` acts as a lightweight business-layer wrapper around the `sendLogDAO`.  
It provides a typed interface for:
- Logging every outbound vendor dispatch.  
- Updating status, responses, and payout info.  
- Retrieving recent send history (for cooldown and reporting logic).

It’s a **pure orchestration service** — no internal business logic, just structured DAO passthroughs with dependency injection.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `sendLogDAO` | Handles persistence of send logs and retrieval by investor/county |
| Types | `sendLogTypes.ts` | Defines DTOs for create/update operations |
| Framework | `tsyringe` | Provides DI container support |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `createLog(data)` | Inserts a new log record (`SendLogInsert` DTO). |
| `getMany(filters)` | Returns paginated send logs with filters (status, investor, affiliate, campaign, county). |
| `updateLog(id, updates)` | Updates a log with vendor response or payout info. |
| `getLastByInvestor(investorId)` | Retrieves last send log for a specific investor. |
| `getLastByCounty(countyId)` | Retrieves last send log for a specific county. |
| `getLatestLogsByInvestorIds(ids)` | Fetches latest logs across multiple investors. |
| `getLatestLogsByCountyIds(ids)` | Fetches latest logs across multiple counties. |

---

### **Architectural Behavior**
- **Read-through service**: All logic delegated to DAO.  
- **Null-safe**: Returns `null` if no record found — prevents runtime exceptions.  
- **Dependency Injection**: `SendLogDAO` injected through constructor; easy to mock/test.  
- **Used by:** `LeadService`, `WorkerService`, possibly `ReportService` (future).  

---

### **Quality and Observations**
✅ Follows SOLID principles (single responsibility, dependency injection).  
✅ Typed DTOs ensure schema safety.  
✅ Consistent async/await flow.  
⚙️ Missing validation on filters (could reject invalid combinations).  
⚙️ No explicit error handling; relies entirely on DAO layer exceptions.  
⚙️ Pagination and filtering logic could be centralized for reuse (appears in other DAOs).  

---

### **Improvement / TODO Suggestions**
- Add input validation for filters (page, limit, status).  
- Add error wrapping for clearer exception reporting.  
- Integrate structured logging (e.g., Winston or Pino) for each create/update.  
- Consider abstracting pagination to a BaseService helper.  
- Add caching for getLastBy* queries if frequently used by workers.  

---

### **Cross-Service Interactions**
```
LeadService → SendLogService → SendLogDAO
WorkerService → SendLogService → SendLogDAO
InvestorService → SendLogService (read-only)
CountyService → SendLogService (read-only)
```

---

## 🧩 vendorReceiveService.ts

### **Purpose**
The `VendorReceiveService` is the development and sandbox-mode equivalent of the external vendor API.  
It provides a **local safe endpoint** for recording what would normally be sent to a vendor — implementing the core concept defined in `LOCAL_DEV_BEHAVIOR.md`.

Essentially, it **stores outbound lead payloads** for inspection and testing rather than sending them externally.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `vendorReceiveDAO` | Persists vendor payloads (`payload` as JSONB) |
| Framework | `tsyringe` | Used for dependency injection (`@injectable`) |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `receive(payload: Record<string, any>)` | Saves the payload to the database using `vendorReceiveDAO.create(payload)` and returns the result. |

---

### **Architectural Behavior**
- Pure **pass-through service** — delegates all persistence to the DAO.  
- Used exclusively in **development and testing** contexts.  
- Should never be called in production (enforced by `LeadService` and `WorkerService`).  
- Forms the heart of **AskZack’s local vendor-safe routing behavior**.  

---

### **Integration Context**
| Upstream | Purpose |
|-----------|----------|
| `LeadService` | Calls this service instead of vendor API when `NODE_ENV !== 'production'`. |
| `WorkerService` | May use it for scheduled mock dispatches in test mode. |
| `LOCAL_DEV_BEHAVIOR.md` | Defines the behavior contract for when this service should be used. |

---

### **Improvement / TODO Suggestions**
- Add optional metadata (source, timestamp override, etc.) to payloads for traceability.  
- Add input validation to ensure payloads are serializable JSON objects.  
- Add structured logging to record when payloads are stored (useful for debugging).  
- Add a method `listRecent(limit?: number)` to fetch recent mock sends.  
- Write integration test to verify vendorReceiveService is triggered in non-production.  

---

### **Cross-Service Interactions**
```

---

## 🧩 workerService.ts

### **Purpose**
The `WorkerService` is the **automation controller** of AskZack.  
It determines *when* a lead should be sent, *which* lead to send, and *enforces all cooldown, timing, and business hour constraints.*

In essence, this service is the **scheduler, filter, and executor** that drives the platform’s autonomous lead dispatch cycle.

---

### **Dependencies**
| Type | Module | Purpose |
|------|---------|----------|
| DAO | `leadDAO` | Retrieve leads available for dispatch |
| DAO | `workerSettingsDAO` | Retrieve timing, cooldown, and scheduling settings |
| DAO | `sendLogDAO` | Check recent send history for cooldown enforcement |
| Service | `leadService` | Executes actual send (including vendor-safe routing) |
| Service | `countyService` | Provides county metadata (timezone, blacklist) |
| Service | `investorService` | Enforces investor cooldown and blacklist |
| Service | `campaignService` | Provides campaign linkage and status |
| Service | `affiliateService` | Provides affiliate linkage and blacklist info |

---

### **Core Functions**
| Method | Description |
|--------|--------------|
| `isTimeToSend()` | Determines if the worker is allowed to send a lead now (based on `send_next_lead_at`). |
| `pickLeadForWorker()` | Chooses the next eligible lead for dispatch, filtering based on cooldowns, business hours, and blacklists. |
| `trashExpiredLeads()` | Marks old unsent leads as expired (using `expire_after_hours` from settings). |
| `applyFilters(leads)` | Core filter logic applying blacklist, cooldown, and business hour constraints. |
| `sendNextLead()` | Fetches the next eligible lead and sends it using `leadService.sendLead()`. Then schedules the next send time. |
| `forceSendLead(leadId)` | Sends a specific lead immediately, bypassing normal timing rules. |
| `scheduleNext()` | Computes the random interval for the next lead send (between `minutes_range_start` and `minutes_range_end`). |

---

### **Architectural Behavior**
- **Core Orchestrator:** Combines DAO data and service logic to manage autonomous lead dispatch.  
- **Decision Engine:** Uses random intervals and deterministic cooldowns for natural pacing.  
- **Safety-Aware:** Filters blacklisted entities and applies time-window restrictions.  
- **Delegation:** Defers sending to `LeadService.sendLead()` — includes vendor-safe logic.  
- **Environment-Safe Inheritance:** Relies on `LeadService` for vendor safety.

---

### **Filter Logic in Detail**
1. **Blacklist checks** — skips leads tied to blacklisted affiliates, campaigns, counties, or investors.  
2. **Investor cooldown** — uses send log data to space investor sends.  
3. **County cooldown** — enforces spacing between county sends.  
4. **Business hours** — evaluates timezone-local hours per county.  
5. **Random selection** — picks one eligible lead for dispatch.

---

### **Gaps and Improvement Opportunities**
- Add explicit environment check before calling `leadService.sendLead()` for redundancy.  
- Add structured logging at key lifecycle points.  
- Add retry suppression for repeated failures.  
- Add try/catch resilience around DAO timeouts.  
- Add audit trail for worker actions.  
- Add `WORKER_DISABLED` env override to globally pause dispatch.  

---

### **Proposed Environment Safety Integration**
```ts
if (process.env.NODE_ENV !== 'production') {
  console.log('[WorkerService] Skipping real vendor send — storing payload locally');
  await this.leadService.vendorReceiveService.receive(payload);
  await this.scheduleNext();
  return;
}
```

---

### **Cross-Service Interactions**
```
WorkerService
 ├─ LeadService (send logic, vendor safety)
 ├─ CountyService (location data)
 ├─ InvestorService (cooldown rules)
 ├─ CampaignService (context data)
 ├─ AffiliateService (blacklist)
 ├─ WorkerSettingsDAO (timing and scheduling)
 └─ SendLogDAO (cooldown tracking)
```

---


---

## 🧩 jobService.ts

### **Purpose**
The `JobService` is the **scheduler manager** of AskZack.  
It is responsible for creating, updating, executing, and deleting recurring jobs that run automation tasks across the platform.

This service connects **job definitions** stored in the database to **actual worker job handlers** under `worker/jobs/`.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `jobDAO` | Stores and retrieves job metadata, status, and last run time |
| Worker | `SendLeadsJob` | Executes automatic lead dispatch cycles |
| Worker | `TrashExpireLeadsJob` | Cleans up expired unsent leads |
| Framework | `tsyringe` | Handles dependency injection and container resolution |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `createJob(name, intervalMinutes, description?)` | Registers a new recurring job, validated against known handlers. |
| `updateJob(jobId, updates)` | Edits job parameters (interval, description, paused state). |
| `runJob(jobId)` | Executes a job handler immediately and logs its result. |
| `isTimeToRun(job)` | Returns true if the job’s interval has elapsed. |
| `pauseJob()` / `resumeJob()` | Toggles job execution state. |
| `markJobComplete()` | Updates `last_run` after successful execution. |
| `deleteJob()` | Soft deletes the job record. |
| `getAvailableJobTypes()` | Lists supported handlers (`sendLeads`, `trashExpireLeads`). |

---

### **Architectural Behavior**
- Uses a **registry pattern** to associate job types with executable handlers.  
- Leverages **dependency injection** via `tsyringe` for handler creation.  
- Records job execution completion timestamps in `jobDAO`.  
- Allows **manual job triggering** for admin tools or tests.  
- Wraps handler execution in try/catch for controlled failure handling.  

---

### **Improvement Opportunities**
- Add environment guard to block jobs in dev mode unless explicitly allowed.  
- Add `jobDAO.updateJobError()` to persist job failure details.  
- Replace console logs with structured logging.  
- Await `handler.execute()` to ensure completion before marking success.  
- Move job handler registration to config or decorator pattern for scalability.  
- Externalize hardcoded time buffer (-30s) into configuration.  
- Replace placeholder `getWorkerId()` logic with actual instance identifier.  

---

### **Cross-Service Interactions**
```
JobService
 ├─ jobDAO (CRUD for job definitions)
 ├─ workerService (lead sending, cleanup)
 ├─ workerSettingsDAO (timing configuration)
 └─ Logs / Console (execution feedback)
```

---

### **Verdict**
✅ **Strong and modular scheduler service**, cleanly managing recurring jobs.  
⚙️ Requires environment safety, structured logging, and improved async handling.  
🧱 Foundation for platform-wide automated task scheduling.
🧠 Central point for all automated vendor dispatch orchestration.
```

---

### **Verdict**
✅ **Simple and solid** — correctly acts as the local stand-in for vendor API calls.  
⚙️ Needs light enhancements (metadata + logging + testing) to become production-grade for dev environments.
### **Verdict**
✅ Stable and clean.  
🧱 No major code defects; just lacks structured validation and logging consistency.  
🔒 Vendor-safe behavior depends entirely on upstream logic in `LeadService`.
LeadService

---

## 🧩 settingsService.ts

### **Purpose**
The `SettingsService` acts as the **central configuration manager** for all automation behavior.  
It abstracts access to `workerSettingsDAO` and `jobDAO`, managing scheduling, timing, and worker parameters for both manual and automated operations.

Essentially, it defines **how the system behaves at runtime** — controlling timing intervals, business hours, and worker state.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `workerSettingsDAO` | Primary persistence for worker-related configuration |
| DAO | `jobDAO` | Used for job-related worker identity (`getWorkerId()`) |
| Types | `WorkerSettings` | Type definition for configuration data |
| Framework | `tsyringe` | Dependency injection management |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `createSettings(settings)` | Creates a new settings entry, defining schedule, hours, and enabled flag. |
| `getWorkerSettings()` | Retrieves the most recent active worker settings. Returns `null` if none exist. |
| `getWorkerId()` | Retrieves the current worker instance ID (delegates to `jobDAO.getWorkerId()`). |
| `updateSettings(settings)` | Updates worker configuration fields (cron, hours, enable state). |
| `updateLastWorkerRun(id)` | Updates `last_worker_run` timestamp. |
| `updateNextLeadTime(id, nextLeadTime)` | Updates the `send_next_lead_at` timestamp for scheduling. |

---

### **Architectural Behavior**
- **Configuration Hub:** Serves as the API for runtime worker control.  
- **Direct DAO Interface:** Delegates persistence to `workerSettingsDAO`.  
- **Cross-Service Link:** Provides worker ID access to `jobService` and `workerService`.  
- **Error Resilience:** Safely returns null if DAO read fails.  
- **No Internal Logic:** Acts as a structured proxy with minimal business processing.  

---

### **Improvement Opportunities**
- Add environment guard to prevent writes in read-only environments.  
- Add structured logging for create/update operations.  
- Add validation for business hour and cron syntax.  
- Unify redundant logic with `workerService` (e.g., `updateNextLeadTime`).  
- Implement proper distributed `getWorkerId()` resolution.  

---

### **Cross-Service Interactions**
```
SettingsService
 ├─ WorkerService (reads timing, updates next send time)
 ├─ JobService (fetches worker ID and scheduling info)
 ├─ WorkerSettingsDAO (CRUD operations)
 └─ JobDAO (worker identity linkage)
```

---

### **Verdict**
✅ **Clean and functional service** — fits the configuration management role.  
⚙️ Needs validation, structured logging, and environment safety integration.  
🧱 Foundation for centralizing runtime and environment-based settings.
 ├─ InvestorService → Cooldown management
 ├─ SendLogService → Dispatch log persistence
 └─ VendorReceiveService → Dev-mode redirection
```

---


---

## 🧩 campaignService.ts

### **Purpose**
The `CampaignService` is the **campaign lifecycle and linkage manager**.  
It handles campaign retrieval, creation, and metadata updates — especially during lead imports or affiliate onboarding.  
It ensures every lead and job run has a valid campaign context.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `campaignDAO` | Fetches, creates, and updates campaign records |
| Service | `affiliateService` | Retrieves affiliate data for cross-linking campaigns |
| Types | `Campaign`, `Affiliate` | Strongly typed entities |
| Framework | `tsyringe` | Dependency injection management |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `getMany(filters)` | Retrieves campaigns (paginated) and their linked affiliates. Returns `{ campaigns, count, affiliates }`. |
| `getByAffiliateId(affiliateId)` | Fetches all campaigns belonging to a given affiliate. |
| `getById(id)` | Retrieves a single campaign by ID. |
| `getManyByIds(ids)` | Returns multiple campaigns based on ID list. |
| `loadOrCreateCampaigns(campaignAffiliateMap, affiliateMap)` | Dynamically creates campaigns that don’t exist when importing leads or syncing affiliate data. |
| `updateCampaignMeta(id, updates)` | Updates campaign rating and blacklist metadata. |

---

### **Architectural Behavior**
- **Link-Oriented Logic:** Associates campaigns and affiliates tightly.  
- **Data Hydration:** Enriches campaign data with linked affiliate objects.  
- **Import-Safe:** Automatically creates campaigns if missing (critical for CSV imports).  
- **Metadata-Driven:** Supports controlled updates (rating, blacklist).  
- **Null-Safe:** Gracefully skips invalid affiliate references.  
- **DAO Delegation:** All persistence handled via `campaignDAO`.  

---

### **Improvement Opportunities**
- Add transaction safety for batch creation during imports.  
- Add structured logging when new campaigns are created dynamically.  
- Add environment awareness to disable auto-creation in production.  
- Implement optional caching for frequent `getByAffiliateId` calls.  
- Add try/catch handling for DAO insert/update errors.  

---

### **Cross-Service Interactions**
```
CampaignService
 ├─ CampaignDAO (data persistence)
 ├─ AffiliateService (affiliate linking)
 ├─ LeadService (campaign validation & enrichment)
 └─ WorkerService (indirect through lead dispatch filtering)
```

---

### **Verdict**
✅ **Stable and efficient relational service**, ensuring campaign-affiliate cohesion and dynamic creation safety.  
⚙️ Should add transaction handling, structured logs, and caching optimizations.  
🧱 Acts as the backbone for lead-to-affiliate campaign mapping.

---

## 🧩 affiliateService.ts

### **Purpose**
The `AffiliateService` manages **affiliate lifecycle operations** — creation, lookup, and metadata updates.  
It acts as the entry point for partner management logic, defining which affiliates can participate in campaigns and how they’re rated or blacklisted.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `affiliateDAO` | Handles persistence of affiliates (CRUD, pagination, metadata updates). |
| Types | `Affiliate` | Entity definition for affiliate objects. |
| Framework | `tsyringe` | Enables dependency injection. |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `loadOrCreateAffiliates(names: Set<string>)` | Loads existing affiliates, creating any missing ones automatically. |
| `getMany(filters)` | Retrieves affiliates with pagination and returns `{ affiliates, count }`. |
| `getManyByIds(ids)` | Retrieves multiple affiliates by ID. |
| `getById(id)` | Fetches a single affiliate by ID. |
| `updateAffiliateMeta(id, updates)` | Updates affiliate `rating` or `blacklisted` metadata. |
| `getAll()` | Returns all affiliates (non-paginated). |

---

### **Architectural Behavior**
- **Dynamic Creation:** Auto-creates affiliates during imports or campaign syncs.  
- **Read-Through Cache:** Builds in-memory map for repeated lookups.  
- **Metadata Management:** Controls rating and blacklist status.  
- **DAO Delegation:** All persistence operations handled by `affiliateDAO`.  
- **Null-Safe:** Uses lowercase normalization to prevent duplicate inserts.  

---

### **Improvement Opportunities**
- Add transaction safety for mass creation.  
- Add structured logging when affiliates are auto-created.  
- Add environment guard to prevent test imports in production.  
- Add validation for affiliate name format.  
- Move case normalization logic into shared helper (e.g., `normalizeName()`).  

---

### **Cross-Service Interactions**
```
AffiliateService
 ├─ AffiliateDAO (CRUD and metadata)
 ├─ CampaignService (affiliate linking)
 ├─ LeadService (affiliate validation during import)
 └─ WorkerService (indirect filtering through campaigns)
```

---

### **Verdict**
✅ **Lightweight and reliable**, foundational for the partner and campaign ecosystem.  
⚙️ Needs better transactional handling, logging, and shared normalization utilities.  
🧱 Core dependency for campaign creation and lead routing consistency.

---

## 🧩 investorService.ts

### **Purpose**
The `InvestorService` manages **investor lifecycle operations**, including creation, lookup, metadata updates, and caching.  
It provides investor-level business logic to upstream services like `leadService` and `workerService` for cooldowns, whitelists, and blacklist handling.

This service ensures investor data integrity and determines eligibility during lead routing.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `investorDAO` | Handles persistence for investor records (CRUD + metadata). |
| Types | `Investor` | Defines investor schema and entity shape. |
| Framework | `tsyringe` | Used for dependency injection. |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `loadOrCreateInvestors(names: Set<string>)` | Loads existing investors and creates missing ones automatically. |
| `getById(id)` | Fetches a single investor by ID. |
| `getMany(filters)` | Returns paginated investors and count. |
| `getManyByIds(ids)` | Fetches multiple investors at once. |
| `updateInvestorMeta(id, updates)` | Updates metadata such as name, whitelist, blacklist, and rating. |

---

### **Architectural Behavior**
- **Dynamic Creation:** Auto-creates missing investors during imports or sync.  
- **In-Memory Map:** Uses name-to-entity map for efficient repeated lookups.  
- **Metadata Management:** Handles investor eligibility (rating, whitelist, blacklist).  
- **DAO Delegation:** All persistence operations handled via `investorDAO`.  
- **Safe Defaults:** Tolerant to nulls and incomplete data.  

---

### **Improvement Opportunities**
- Add transaction safety for batch creation during imports.  
- Add structured logging for new investor creation.  
- Add environment guard to prevent accidental inserts in production test runs.  
- Add cooldown/whitelist enforcement logic.  
- Move case normalization to a shared helper (used also by affiliateService).  

---

### **Cross-Service Interactions**
```
InvestorService
 ├─ InvestorDAO (CRUD + metadata)
 ├─ LeadService (whitelist, cooldown enforcement)
 ├─ WorkerService (fetches investors for eligibility)
 └─ SendLogService (provides cooldown timestamps)
```

---

### **Verdict**
✅ **Reliable and modular service** for investor data management.  
⚙️ Needs transaction support, logging, and reusable normalization helpers.  
🧱 Core dependency for lead eligibility and fair dispatch control.

---

## 🧩 countyService.ts

### **Purpose**
The `CountyService` manages **geographic data** — specifically counties and their blacklist/whitelist states.  
It ensures counties are consistently created, imported, and updated, supporting geographic filtering in lead dispatch.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `countyDAO` | Handles CRUD operations and blacklist/whitelist toggling. |
| Middleware | `parseCsvToCounties` | Parses CSV data into normalized county objects. |
| Type | `County` | County entity schema. |
| Type | `parsedLeadFromCSV` | Used to extract or create counties during lead imports. |
| Framework | `tsyringe` | Dependency injection container. |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `getAll()` | Fetches all counties from the database. |
| `loadOrCreateCounties(leads)` | Loads existing counties and dynamically creates new ones based on lead data. |
| `importCounties(csvContent)` | Parses and imports county data from CSV files, handling duplicates and malformed rows. |
| `updateCountyBlacklistStatus(id, blacklisted)` | Toggles a county’s blacklist flag. |
| `updateCountyMeta(id, updates)` | Updates county metadata (name, state, population, timezone, flags). |
| `getManyByIds(ids)` | Retrieves multiple counties by ID. |
| `getMany(filters)` | Returns paginated results with search and filter options. |
| `getById(id)` | Fetches a specific county record by ID. |

---

### **Architectural Behavior**
- **Import-Aware:** Auto-creates counties during CSV import or lead ingestion.  
- **Normalization:** Lowercases and trims all county/state names.  
- **Error-Tolerant:** Aggregates CSV import errors instead of failing early.  
- **Blacklist/Whitelist Management:** Updates county eligibility in database.  
- **DAO Delegation:** Performs all persistence via `countyDAO`.  

---

### **Improvement Opportunities**
- Add transaction wrapping for imports.  
- Replace `console.log` with structured logging (e.g., `winston`, `pino`).  
- Add CSV header validation before parsing.  
- Add environment guard to prevent production imports.  
- Move normalization logic to shared utility.  
- Implement caching for frequent lookups.  

---

### **Cross-Service Interactions**
```
CountyService
 ├─ CountyDAO (CRUD + blacklist control)
 ├─ LeadService (validates lead location)
 ├─ WorkerService (applies time and location filters)
 └─ SendLogService (indirect via cooldown logic)
```

---

### **Verdict**
✅ **Robust and well-structured service** that ensures geographic data consistency.  
⚙️ Requires transaction wrapping, structured logging, and normalization refactor.  
🧱 Core to enforcing location-based rules for lead dispatch.

---

## 🧩 leadFormInputService.ts

### **Purpose**
The `LeadFormInputService` manages structured form data associated with leads.  
It provides CRUD operations for metadata fields attached to each lead and ensures data consistency across creation and updates.

This service forms the basis of **lead enrichment**, ensuring complete and valid vendor payloads.

---

### **Dependencies**
| Type | Module | Responsibility |
|------|---------|----------------|
| DAO | `leadFormInputDAO` | Handles persistence of form input data (CRUD). |
| Types | `LeadFormInputCreate`, `LeadFormInputUpdate`, `LeadFormInput` | Defines the schema and validation shape. |
| Framework | `tsyringe` | Dependency injection container. |

---

### **Core Methods**
| Method | Description |
|--------|--------------|
| `getByLeadId(leadId)` | Retrieves structured form input for a given lead. Throws if no ID provided. |
| `create(formData)` | Creates a new lead form input entry. |
| `update(leadId, updates)` | Updates existing form input data by lead ID. Throws if ID missing. |
| `delete(leadId)` | Deletes form input data associated with a given lead. |

---

### **Architectural Behavior**
- **Strict Validation:** Ensures `leadId` presence on retrieval and update.  
- **Thin Service Layer:** Delegates all persistence to `leadFormInputDAO`.  
- **Type-Safe:** Fully typed DTOs for input/output.  
- **Testable:** Clean async/await methods with DI support.  

---

### **Improvement Opportunities**
- Add structured logging for create/update/delete.  
- Add deeper validation (field presence, type enforcement).  
- Add environment guard to prevent deletions in production.  
- Add batch create/update support for multi-lead imports.  
- Wrap DAO calls in try/catch for safer error handling.  

---

### **Cross-Service Interactions**
```
LeadFormInputService
 ├─ LeadFormInputDAO (CRUD)
 ├─ LeadService (enrichment)
 └─ VendorReceiveService (sandbox payloads)
```

---

### **Verdict**
✅ **Simple and solid CRUD service** for managing structured form input.  
⚙️ Needs validation, structured logging, and batch support.  
🧱 Crucial for consistent lead metadata and vendor payload completeness.