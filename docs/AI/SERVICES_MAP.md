# AskZack Services Map (v1)

This document outlines the structure, dependencies, and business logic responsibilities of the **service layer** within the AskZack backend.

Each service coordinates multiple DAOs and enforces core business rules.

---

## 📁 Directory Overview

**Path:** `server/src/main/services/`

| Service File | Purpose / Core Role |
|---------------|----------------------|
| `affiliateService.ts` | Manages affiliate lifecycle, rating, and blacklist management. |
| `campaignService.ts` | Manages campaigns and their relationships to affiliates. |
| `countyService.ts` | Handles county imports, filtering, and status toggling. |
| `investorService.ts` | Orchestrates investor onboarding, ratings, and preferences. |
| `jobService.ts` | Handles job creation and scheduling, integrates with worker settings. |
| `leadFormInputService.ts` | Manages structured form data attached to leads. |
| `leadService.ts` | Core lead ingestion, verification, dispatch, and lifecycle management. 🚨 Primary integration point for vendor-safe behavior. |
| `sendLogService.ts` | Responsible for logging outbound vendor communications. |
| `settingsService.ts` | Wraps and manages global worker settings configuration. |
| `userService.ts` | Handles authentication, roles, and access control. |
| `vendorReceiveService.ts` | Stores inbound vendor payloads or dev-mode mocks (via `vendorReceiveDAO`). |
| `workerService.ts` | Executes scheduled jobs and automation; orchestrates lead sending, expiry, and dispatch frequency. |

---

## 🔗 Inter-Service Dependencies

```
workerService
 ├─ jobService
 ├─ settingsService
 ├─ leadService
 │    ├─ sendLogService
 │    ├─ vendorReceiveService (dev mode)
 │    └─ campaignService / investorService
 └─ workerSettingsDAO
```

---

## 🧠 Key System Behaviors

### Lead Lifecycle (Core Flow)
1. **LeadService** handles lead creation, verification, and dispatch decisions.
2. When dispatching leads:
   - If `NODE_ENV === 'production'`, sends through `VendorService.postToVendor()`.
   - Otherwise, redirects to `VendorReceiveDAO.create()` for safe logging.
3. After dispatch, **SendLogService** records the transaction in `send_log`.
4. **WorkerService** and **JobService** coordinate automated lead sending, using timing and frequency rules from `WorkerSettingsDAO`.

### Vendor-Safe Mode (Development Behavior)
Defined in [`LOCAL_DEV_BEHAVIOR.md`](./LOCAL_DEV_BEHAVIOR.md):
- No external HTTP requests are made in dev mode.
- LeadService and WorkerService must enforce this at dispatch level.
- Logged payloads are stored in `vendor_receives` for local replay.

---

## 🧩 Responsibilities by Layer

### Service Layer
- Translates business logic into coordinated DAO calls.
- Enforces domain rules (e.g., lead verification, rating filters, vendor timing windows).
- Handles orchestration between automated workers, campaigns, and vendors.


## 🔄 Updates — LeadService Enhancements

- Added dependency on `vendorReceiveService` for **dev-mode vendor-safe routing**.
- Integrated with `iSpeedToLeadIAO` for vendor API dispatch.
- `sendLead()` must implement an environment-aware guard:
  ```ts
  if (process.env.NODE_ENV !== 'production') {
    await vendorReceiveDAO.create(payload);
    return;
  }
  ```
- This rule prevents accidental vendor spam and aligns with `LOCAL_DEV_BEHAVIOR.md`.

### Worker Layer
- Executes jobs and schedules using settings defined via services.
- Responsible for invoking the correct service operations per environment.

---

## 🔄 Update Policy
This map must be updated whenever a service is added, removed, or changes its dependencies.
The document serves as AskZack’s live reference for business-layer orchestration.