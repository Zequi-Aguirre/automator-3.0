# AskZack Resource Behavior Summary (v1)

This document captures the behavior of the REST API layer (resources/controllers) of the AskZack backend.  
Each resource defines a public HTTP interface for managing entities through the corresponding service layer.

All routes (except `/api/authenticate`, `/api/mock-vendor`, `/api/leads-open`) are globally protected by  
the **`Authenticator.authenticateFunc()`** middleware defined in `AutomatorServer.ts`.  
Therefore, all endpoints below are **authenticated by default**.

---

## 🧩 affiliateResource.ts

### **Purpose**
The `AffiliateResource` exposes REST endpoints for affiliate management.  
It provides administrative functionality for reading, updating, and inspecting affiliate data.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/admin/get-many` | Returns paginated list of affiliates. Accepts `page` and `limit` query params. | `affiliateService.getMany()` |
| `PATCH` | `/admin/update-meta/:affiliateId` | Updates affiliate metadata (rating, blacklist). | `affiliateService.updateAffiliateMeta()` |
| `GET` | `/admin/:affiliateId` | Retrieves details for a specific affiliate. | `affiliateService.getById()` |

---

### **Authentication & Security**
✅ All routes are authenticated through `Authenticator.authenticateFunc()` middleware.  
❗ Requires a valid API key or token — handled automatically by the AutomatorServer setup.

---

### **Architectural Behavior**
- Routes are organized under `/admin/*`.  
- Fully asynchronous (async/await) and dependency-injected via tsyringe.  
- Relies on `affiliateService` for all data access and mutation.  
- Responds with structured JSON payloads.  
- Handles missing affiliate with `404 Not Found`.  

---

### **Improvement Opportunities**
- Add input validation for `PATCH` request body using a schema (`zod` or `yup`).  
- Wrap all service calls in `try/catch` for consistent error handling.  
- Add request/response logging for traceability.  
- Define response DTOs for consistent API shape.  

---

### **Cross-Layer Interactions**
```
AffiliateResource
 ├─ AffiliateService (business logic)
 ├─ AffiliateDAO (data persistence)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Functional and properly authenticated**, well-structured controller.  
⚙️ Needs input validation and error handling improvements for production reliability.

---

## 🧩 countyResource.ts

### **Purpose**
The `CountyResource` exposes admin-facing endpoints for managing counties, including CSV imports, blacklist toggles, and metadata queries.  
It acts as the controller for the `CountyService` layer.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/admin/get-all` | Fetches all counties (non-paginated). | `countyService.getAll()` |
| `GET` | `/admin/get-many` | Returns paginated and filtered counties with optional `search` and `status`. | `countyService.getMany()` |
| `PATCH` | `/admin/blacklist/:countyId` | Toggles county blacklist state. | `countyService.updateCountyBlacklistStatus()` |
| `POST` | `/admin/import` | Imports counties from CSV file (multipart upload). | `countyService.importCounties()` |

---

### **Authentication & Security**
✅ All routes protected by `Authenticator.authenticateFunc()` middleware.  
✅ Only authorized API key or token holders can perform imports or modifications.

---

### **Architectural Behavior**
- Uses `multer` for in-memory file uploads.  
- Delegates all data logic to `countyService`.  
- Returns consistent JSON responses.  
- Includes basic `try/catch` for import route errors.  
- Logs import summary to console.  

---

### **Improvement Opportunities**
- Add validation for CSV file content and headers.  
- Replace console logging with structured logger (e.g., `pino`, `winston`).  
- Add consistent error handling for all routes.  
- Implement pagination bounds validation (`limit <= 500`).  
- Add optional rate limiting for import endpoints.  

---

### **Cross-Layer Interactions**
```
CountyResource
 ├─ CountyService (CRUD and import logic)
 ├─ CountyDAO (database persistence)
 ├─ Authenticator (global middleware)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Secure and reliable** controller for county management.  
⚙️ Needs CSV validation, structured logging, and error wrapping for robustness.  
🧱 Core interface for administrative control of geographic data.

---

## 🧩 campaignResource.ts

### **Purpose**
The `CampaignResource` exposes admin-facing endpoints for managing campaigns, including listing, fetching by affiliate, and updating campaign metadata.  
It bridges HTTP requests with the `CampaignService` and defines the administrative API surface for campaign operations.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/admin/get-many` | Retrieves paginated campaigns. | `campaignService.getMany()` |
| `GET` | `/admin/get-by-affiliate/:affiliateId` | Fetches all campaigns linked to a specific affiliate. | `campaignService.getByAffiliateId()` |
| `PATCH` | `/admin/update-meta/:campaignId` | Updates campaign metadata (`rating`, `blacklisted`). | `campaignService.updateCampaignMeta()` |

---

### **Authentication & Security**
✅ All routes are protected by `Authenticator.authenticateFunc()` middleware.  
✅ Ensures only API-key-authenticated admin requests are allowed.

---

### **Architectural Behavior**
- Direct mapping between routes and `CampaignService` methods.  
- Fully asynchronous, returning JSON responses.  
- Organized under `/admin/*` for administrative access.  
- Dependency-injected via tsyringe.  
- Lacks explicit error handling in route handlers.  

---

### **Improvement Opportunities**
- Add `try/catch` around service calls for proper error responses.  
- Add validation for parameters and request bodies.  
- Implement structured logging for monitoring updates.  
- Enforce pagination bounds (e.g., max 100).  
- Optionally add role-based authorization for admin operations.  

---

### **Cross-Layer Interactions**
```
CampaignResource
 ├─ CampaignService (business logic)
 ├─ CampaignDAO (data persistence)
 ├─ Authenticator (global auth)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Well-structured controller** matching campaign service logic.  
⚙️ Needs validation, structured logging, and consistent error handling.  
🧱 Central for administrative campaign management.

---

## 🧩 investorResource.ts

### **Purpose**
The `InvestorResource` defines REST endpoints for managing investors, including listing, metadata updates, and retrieval by ID.  
It mirrors the affiliate and campaign controllers for admin consistency.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/admin/get-many` | Returns paginated investors. | `investorService.getMany()` |
| `PATCH` | `/admin/update-meta/:affiliateId` | Updates investor metadata (`rating`, `blacklisted`). | `investorService.updateInvestorMeta()` |
| `GET` | `/admin/:affiliateId` | Retrieves investor details by ID. | `investorService.getById()` |

---

### **Authentication & Security**
✅ Protected by `Authenticator.authenticateFunc()` middleware globally.  
✅ Access limited to API-key-authenticated admin users.

---

### **Architectural Behavior**
- Organized under `/admin/*` endpoints for controlled administrative access.  
- Uses async/await for all operations.  
- Delegates logic to `InvestorService` for persistence and validation.  
- Responds with appropriate HTTP status codes.  
- Currently reuses `affiliateId` param instead of `investorId`.  

---

### **Improvement Opportunities**
- Rename route params from `affiliateId` to `investorId`.  
- Add `try/catch` around async routes for robust error handling.  
- Add schema validation for `req.body` and `req.params`.  
- Introduce structured logging for update actions.  
- Enforce pagination limit (e.g., 100).  

---

### **Cross-Layer Interactions**
```
InvestorResource
 ├─ InvestorService (business logic)
 ├─ InvestorDAO (persistence)
 ├─ Authenticator (global middleware)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Clean and consistent controller** for investor administration.  
⚙️ Needs parameter renaming, input validation, and structured error wrapping.  
🧱 Maintains symmetry with other administrative REST resources.

---

## 🧩 leadResource.ts

### **Purpose**
The `LeadResource` is the central REST controller for lead management.  
It handles lead retrieval, updating, verification, and administrative dispatch operations.  
It interfaces directly with `LeadService` to power both operational and admin workflows.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/get-many` | Retrieves paginated leads with optional search and status filters. | `leadService.getMany()` |
| `GET` | `/get/:leadId` | Fetches a single lead by ID. | `leadService.getLeadById()` |
| `PATCH` | `/update/:leadId` | Updates a lead record by ID. | `leadService.updateLead()` |
| `PATCH` | `/admin/send/:leadId` | Sends a lead manually (admin trigger). | `leadService.sendLeadWithDelay()` *(stubbed)* |
| `PATCH` | `/verify/:leadId` | Verifies a lead record. | `leadService.verifyLead()` |
| `PATCH` | `/unverify/:leadId` | Reverts verification state. | `leadService.unverifyLead()` |
| `PATCH` | `/trash/:leadId` | Marks a lead as trashed. | `leadService.trashLead()` |

---

### **Authentication & Security**
✅ All routes protected by `Authenticator.authenticateFunc()` middleware.  
⚙️ Relies on middleware-attached `req.user.id` for admin send operations.  
⚠️ Consider explicit admin role guard for `/admin/send/:leadId`.

---

### **Architectural Behavior**
- Uses async/await with consistent try/catch handling.  
- Delegates all logic to `LeadService`.  
- Returns standardized JSON responses.  
- Contains a stubbed send method for manual dispatches.  
- Uses flexible query parameters for pagination.  
- Logs exceptions via `console.error`.  

---

### **Improvement Opportunities**
- Implement actual `sendLeadWithDelay()` logic integrated with `workerService`.  
- Add schema validation for request bodies and query params.  
- Enforce admin-only access on `/admin/send` route.  
- Add structured logging (replace `console.error`).  
- Enforce pagination limit (e.g., 100).  
- Consider rate limiting for manual send triggers.  

---

### **Cross-Layer Interactions**
```
LeadResource
 ├─ LeadService (core logic)
 ├─ WorkerService (send logic integration)
 ├─ Authenticator (global middleware)
 └─ Express Router (HTTP layer)
```

---

### **Verdict**
✅ **Robust and complete controller** for lead lifecycle management.  
⚙️ Needs improved validation, structured logging, and send integration.  
🧱 Core hub for administrative and operational lead processing.

---

## 🧩 leadFormInputResource.ts

### **Purpose**
The `LeadFormInputResource` provides CRUD endpoints for managing structured form data tied to leads.  
It supports creation, retrieval, update, and deletion of lead form input entries.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/get-by-lead-id/:leadId` | Retrieves form input for a given lead. | `leadFormInputService.getByLeadId()` |
| `POST` | `/create` | Creates a new form input entry. | `leadFormInputService.create()` |
| `PATCH` | `/update/:leadId` | Updates form input data for a lead. | `leadFormInputService.update()` |
| `DELETE` | `/form-input/:leadId` | Deletes form input data by lead ID. | `leadFormInputService.delete()` |

---

### **Authentication & Security**
✅ All routes protected by global `Authenticator.authenticateFunc()` middleware.  
✅ Restricts CRUD actions to authenticated system/admin requests.

---

### **Architectural Behavior**
- Fully CRUD-compliant with async/await usage.  
- Consistent try/catch error handling across all endpoints.  
- Returns standardized HTTP status codes (201, 200, 204).  
- Provides descriptive error messages.  
- Uses DTOs for type safety and validation shape.  

---

### **Improvement Opportunities**
- Add input validation for request bodies (schema enforcement).  
- Replace `console.error` with structured logging (`winston` or `pino`).  
- Add fine-grained authorization for delete/update routes.  
- Return 404 when target lead ID not found.  
- Implement rate limiting to prevent abuse.  

---

### **Cross-Layer Interactions**
```
LeadFormInputResource
 ├─ LeadFormInputService (business logic)
 ├─ LeadFormInputDAO (database layer)
 ├─ Authenticator (global middleware)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Clean and production-ready structure** for lead form input management.  
⚙️ Requires validation and improved observability for completeness.  
🧱 Ensures metadata consistency within the lead ecosystem.

---

## 🧩 sendLogResource.ts

### **Purpose**
The `SendLogResource` provides endpoints for retrieving and updating lead send logs.  
It enables administrators to inspect, filter, and correct send history data for auditing or debugging purposes.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/admin/get-many` | Retrieves paginated send logs with filters (`status`, `investor_id`, `affiliate_id`, `campaign_id`, `county_id`). | `sendLogService.getMany()` |
| `PATCH` | `/admin/update/:logId` | Updates a send log record. | `sendLogService.updateLog()` |

---

### **Authentication & Security**
✅ All routes are protected by `Authenticator.authenticateFunc()` middleware.  
✅ Accessible only to authenticated admin/system requests.

---

### **Architectural Behavior**
- Asynchronous operations with query-based filtering.  
- Delegates all business logic to `SendLogService`.  
- Returns standardized JSON responses.  
- No explicit `try/catch` blocks — relies on higher-level middleware.  
- Defaults to pagination with `page=1` and `limit=50`.  

---

### **Improvement Opportunities**
- Add `try/catch` for all async routes or use centralized error handler.  
- Add schema validation for query parameters and `logId`.  
- Implement structured logging for updates and queries.  
- Enforce pagination limits (e.g., `limit <= 200`).  
- Add admin-role validation for `PATCH` routes.  

---

### **Cross-Layer Interactions**
```
SendLogResource
 ├─ SendLogService (business logic)
 ├─ SendLogDAO (database persistence)
 ├─ Authenticator (global middleware)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Functional and efficient controller** for viewing and managing send logs.  
⚙️ Needs error handling, input validation, and structured logging for observability.  
🧱 Key for lead dispatch tracking and vendor auditability.

---

## 🧩 settingsResource.ts

### **Purpose**
The `SettingsResource` provides endpoints for retrieving and updating global and worker-level application settings.  
It acts as the administrative interface for configuration management.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/worker-settings` | Retrieves current worker and system configuration. | `settingsService.getWorkerSettings()` |
| `PATCH` | `/admin/update` | Updates application-wide settings. | `settingsService.updateSettings()` |

---

### **Authentication & Security**
✅ All routes protected by global `Authenticator.authenticateFunc()` middleware.  
✅ Only authenticated requests can read or modify settings.  
⚙️ Consider explicit admin authorization for `/admin/update`.

---

### **Architectural Behavior**
- Clean and minimal Express controller with two endpoints.  
- Relies on dependency-injected `SettingsService`.  
- Uses async/await for both operations.  
- No inline error handling (relies on global middleware).  
- Missing payload validation for update route.  

---

### **Improvement Opportunities**
- Add schema validation for `/admin/update` request body.  
- Add structured error handling (try/catch or middleware).  
- Implement structured logging for all config changes.  
- Add admin-only guard to restrict access to `/admin/update`.  
- Track versioning or changelog of configuration updates for auditability.  

---

### **Cross-Layer Interactions**
```
SettingsResource
 ├─ SettingsService (core logic)
 ├─ WorkerSettingsDAO (persistence)
 ├─ Authenticator (middleware)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Clean and functional controller** for system configuration management.  
⚙️ Needs validation, authorization, and logging to be production-safe.  
🧱 Core administrative tool for operational configuration updates.

---

## 🧩 workerResource.ts

### **Purpose**
The `WorkerResource` provides administrative endpoints to control and monitor the background worker system.  
It enables manual lead dispatching, starting/stopping the worker, updating cron schedules, and retrieving current worker status.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service / Action |
|--------------|-----------|-------------|------------------------------|
| `PATCH` | `/admin/send-now/:leadId` | Forces a manual lead dispatch. | `workerService.forceSendLead()` |
| `PATCH` | `/admin/start` | Enables the worker and initializes cron. | `settingsService.updateSettings()`, `worker.initialize()` |
| `PATCH` | `/admin/stop` | Disables the worker and stops cron. | `settingsService.updateSettings()`, `worker.stop()` |
| `GET` | `/admin/status` | Returns worker configuration and runtime status. | `settingsService.getWorkerSettings()`, `worker.isRunning()` |
| `PATCH` | `/admin/update-cron` | Updates cron schedule and restarts if enabled. | `settingsService.updateSettings()`, `worker.initialize()` |

---

### **Authentication & Security**
✅ All routes are secured via `Authenticator.authenticateFunc()` middleware.  
✅ Restricted to authenticated admin/system users.  
⚙️ Add explicit admin role validation for high-impact endpoints.

---

### **Architectural Behavior**
- Implements async/await with full `try/catch` coverage.  
- Integrates tightly with `SettingsService` and `WorkerService`.  
- Uses clear and descriptive JSON responses.  
- Validates required params (`leadId`, `cron_schedule`).  
- Keeps DB and runtime worker states synchronized.  

---

### **Improvement Opportunities**
- Add admin role-based access control to `/admin/*` endpoints.  
- Implement structured logging for start/stop/update events.  
- Add input validation for `leadId` and `cron_schedule`.  
- Add rate limiting for `/admin/send-now` to prevent misuse.  
- Introduce audit trail tracking for worker setting changes.  

---

### **Cross-Layer Interactions**
```
WorkerResource
 ├─ WorkerService (lead sending logic)
 ├─ SettingsService (DB control)
 ├─ Worker (runtime cron handler)
 ├─ Authenticator (middleware)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Well-designed and powerful operational controller** for background job management.  
⚙️ Requires enhanced access control, logging, and audit tracking for production safety.  
🧱 Central to Automator’s runtime reliability and worker orchestration.

---

## 🧩 jobResource.ts

### **Purpose**
The `JobResource` defines API endpoints for managing background jobs, including creation, modification, manual execution, pausing, and resuming.  
It serves as the administrative controller for the job scheduling and execution subsystem.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/admin/` | Retrieves all jobs. | `jobService.getAllJobs()` |
| `GET` | `/admin/:jobId` | Retrieves a specific job by ID. | `jobService.getJob()` |
| `POST` | `/admin/` | Creates a new job. | `jobService.createJob()` |
| `PATCH` | `/admin/:jobId` | Updates job settings. | `jobService.updateJob()` |
| `POST` | `/admin/:jobId/run` | Executes a job manually. | `jobService.runJob()` |
| `POST` | `/admin/:jobId/pause` | Pauses a job. | `jobService.pauseJob()` |
| `POST` | `/admin/:jobId/resume` | Resumes a job. | `jobService.resumeJob()` |
| `DELETE` | `/admin/:jobId` | Deletes a job record. | `jobService.deleteJob()` |

---

### **Authentication & Security**
✅ All routes protected by `Authenticator.authenticateFunc()` middleware.  
✅ Restricted to authenticated admin/system users.  
⚙️ Add role-based authorization for job control operations.

---

### **Architectural Behavior**
- Implements full CRUD and control functionality for background jobs.  
- Delegates logic to `JobService`.  
- Uses async/await consistently.  
- No explicit error handling or schema validation.  
- Uses `console.log` for execution logs.  

---

### **Improvement Opportunities**
- Add try/catch or global error handler for all routes.  
- Implement schema validation for job creation and update payloads.  
- Replace console logging with structured logs.  
- Add admin-only enforcement for `run`, `delete`, and `update` endpoints.  
- Track audit metadata (creator, modifier, executor).  
- Add pagination to `/admin/` job listing.  

---

### **Cross-Layer Interactions**
```
JobResource
 ├─ JobService (business logic)
 ├─ JobDAO (database layer)
 ├─ Authenticator (middleware)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Complete and effective controller** for job lifecycle management.  
⚙️ Needs validation, structured logging, and audit tracking to ensure reliability.  
🧱 Core administrative layer for scheduled and manual job control.

---

## 🧩 userResource.ts

### **Purpose**
The `UserResource` defines endpoints for retrieving authenticated user data.  
It acts as a simple interface to fetch profile details of the current session user.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `GET` | `/info` | Retrieves user information for the authenticated account. | `userService.getUserById()` |

---

### **Authentication & Security**
✅ Secured globally through `Authenticator.authenticateFunc()` middleware.  
✅ Requires valid session or API key (middleware populates `req.user`).  
⚙️ Should include null-check on `req.user` to prevent runtime errors.

---

### **Architectural Behavior**
- Minimal single-route controller for authenticated user data.  
- Uses dependency injection for `UserService`.  
- Async/await structure with direct response output.  
- Relies on global error handling middleware.  
- No structured logging or guard clauses.  

---

### **Improvement Opportunities**
- Add `try/catch` error handling for safer operation.  
- Add null-check for `req.user` to handle failed authentication cases.  
- Implement structured logging for traceability.  
- Optionally add endpoints for profile update or user listing (admin use).  
- Plan for role-based permission checks in future expansion.  

---

### **Cross-Layer Interactions**
```
UserResource
 ├─ UserService (business logic)
 ├─ Authenticator (middleware populating req.user)
 └─ Express Router (HTTP interface)
```

---

### **Verdict**
✅ **Lightweight and effective controller** for user information retrieval.  
⚙️ Should include error handling, null safety, and logging for robustness.  
🧱 Foundational piece in the authentication and access control system.

---

## 🧩 vendorReceiveResource.ts

### **Purpose**
The `VendorReceiveResource` defines the public-facing API endpoint that accepts lead payloads from external vendors.  
It delegates processing to the `VendorReceiveService`, which handles validation, persistence, and lead ingestion logic.

---

### **Routes Overview**
| HTTP Method | Endpoint | Description | Underlying Service Method |
|--------------|-----------|-------------|-----------------------------|
| `POST` | `/` | Accepts lead payload from an external vendor. | `vendorReceiveService.receive()` |

---

### **Authentication & Security**
⚠️ Currently **no authentication** is applied. The route is public to allow vendor submissions.  
⚙️ Must include vendor API key or signature verification to prevent unauthorized submissions.  
⚙️ Optionally restrict IP access to known vendors.  

---

### **Architectural Behavior**
- Minimal single-route Express controller.  
- Uses async/await with proper try/catch error handling.  
- Logs errors to `console.error` (should switch to structured logging).  
- Returns appropriate HTTP statuses (`201` success, `500` failure).  
- Uses dependency injection for `VendorReceiveService`.  

---

### **Improvement Opportunities**
- Add vendor authentication (API key or signed token validation).  
- Implement payload schema validation.  
- Replace `console.error` with structured logging.  
- Add rate limiting and request throttling.  
- Record metadata (timestamp, vendor ID, IP) for ingestion tracking.  

---

### **Cross-Layer Interactions**
```
VendorReceiveResource
 ├─ VendorReceiveService (lead ingestion logic)
 ├─ VendorReceiveDAO (data persistence)
 └─ Express Router (public HTTP interface)
```

---

### **Verdict**
✅ **Simple and efficient controller** for handling vendor-submitted leads.  
⚠️ Requires authentication, logging, and validation for production security.  
🧱 Entry point of the Automator pipeline and key to vendor system reliability.