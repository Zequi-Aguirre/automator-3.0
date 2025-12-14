# TODO Index

This document tracks all code improvements, refactors, and maintenance tasks discovered during analysis.

Each entry should link to a file or module and summarize the intended change.

## affiliateDAO.ts
- [ ] Combine `getManyByIds()` and `getAffiliatesByIds()` — duplicate logic detected.
- [ ] Review DAO consistency across entities for repeated pagination patterns.

## Global
- [ ] Establish consistent null-handling rules across all update() methods (use toggling functions, not direct null updates).


## countyDAO.ts
- [ ] Parameterize search clause in `getMany()` to prevent SQL injection risk.
- [ ] Abstract pagination + filtering logic into shared BaseDAO.
- [ ] Refactor `updateCountyBlacklistStatus()` to reuse `updateCounty()` logic.
- [ ] Review nullable insert fields (population, timezone) for consistency with update policy.

## investorDAO.ts
- [ ] Abstract pagination + count logic into BaseDAO helper.
- [ ] Create shared update-field assembly helper across DAOs.
- [ ] Confirm investor table fields align with affiliate/campaign schema conventions.

## jobDAO.ts
- [ ] Replace hardcoded worker ID in `getWorkerId()` with real DB query or worker registration system.
- [ ] Abstract `updated = NOW()` logic into shared timestamp helper.
- [ ] Add validation for `interval_minutes` to ensure it’s positive.

## leadDAO.ts
- [ ] Abstract `getUpdatedLeadFields()` logic into shared BaseDAO helper.
- [ ] Optimize `getMany()` filters with modular SQL builder or helper.
- [ ] Replace sequential insert loop in `createLeads()` with batch insert using `pg-promise.helpers.insert()`.
- [ ] Standardize error messages to include lead ID for better traceability.
- [ ] Clean up console logs from `createLeads()` (delegate to worker or service).
- [ ] Simplify join clauses in `getMany()` for clarity and consistent aliasing.
- [ ] Centralize `deleted = NOW()` and timestamp updates across DAOs.

## leadFormInputDAO.ts
- [ ] Replace explicit field list in `update()` with shared dynamic update-field builder (same as affiliateDAO/campaignDAO).
- [ ] Avoid SQL-level COALESCE; maintain pre-merge TypeScript update logic for null-safety consistency.
- [ ] Add schema validation for numeric fields (form_square, form_year, etc.).
- [ ] Unify delete() with shared soft-delete helper.

## sendLogDAO.ts
- [ ] Abstract common JOIN + WHERE patterns (e.g., `JOIN leads`) into reusable SQL helper.
- [ ] Centralize pagination and count logic across DAOs.
- [ ] Add support for date range filtering (`created BETWEEN ...`) in getMany().
- [ ] Improve error messages in updateLog() to include log or lead ID.
- [ ] Standardize status and response_code enums across DAOs and types.
- [ ] Investigate COUNT(*) performance optimizations (CTE or caching).

## userDAO.ts
- [ ] Add `deleted IS NULL` condition to all queries to follow soft-delete convention.
- [ ] Implement insert, update, and delete methods for user management.
- [ ] Add role-based filtering support for admin dashboards.
- [ ] Ensure `users` table includes `deleted` and `modified` timestamps.
- [ ] Wrap oneOrNone calls with try/catch for safer DB error handling.
- [ ] Maintain schema consistency with other DAOs (deleted + modified columns).

## vendorReceiveDAO.ts
- [ ] Add `source`, `attempt_count`, and `response_mock` fields to track payload origin and simulate vendor responses.
- [ ] Implement soft-delete and retrieval methods (getById, getRecent) for replay capability.
- [ ] Add validation and logging wrappers for debugging malformed payloads.

## Global / Service Integration
- [ ] Implement environment-aware dispatch logic:
      if (ENV == 'production') → VendorService.postToVendor()
      else → VendorReceiveDAO.create(payload)
- [ ] Ensure all lead or job dispatches use the above conditional to prevent accidental vendor spam.
- [ ] Add integration tests to verify non-production environments never hit external vendor endpoints.
- [ ] Document this rule in LOCAL_DEV_BEHAVIOR.md and integrate into SERVICE_POLICY.md.

## workerSettingsDAO.ts
- [ ] Integrate environment safeguard check into worker dispatch logic.
- [ ] Abstract shared merge logic into BaseDAO helper.
- [ ] Add validation for delay and range values to ensure safe bounds.
- [ ] Standardize error message templates across DAOs.
- [ ] Add audit log when worker settings are changed.

## leadService.ts
- [ ] Add NODE_ENV check before vendor send (redirect to vendorReceiveDAO in non-production).
- [ ] Implement retry/backoff logic for failed vendor sends.
- [ ] Distinguish timeout (408) vs hard failure in sendLead().
- [ ] Add centralized error handler with contextual info.
- [ ] Add batch insert optimization to importLeads().
- [ ] Add transactional guard for duplicate sendLead() calls.
- [ ] Add test coverage for vendor-safe routing logic.

## sendLogService.ts
- [ ] Add input validation for filters (page, limit, status).
- [ ] Add error wrapping for clearer exception reporting.
- [ ] Integrate structured logging (e.g., Winston or Pino) for each create/update.
- [ ] Consider abstracting pagination to a BaseService helper.
- [ ] Add caching for getLastBy* queries if frequently used by workers.

## vendorReceiveService.ts
- [ ] Add optional metadata (source, timestamp override, etc.) to payloads for traceability.
- [ ] Add input validation to ensure payloads are serializable JSON objects.
- [ ] Add structured logging to record when payloads are stored.
- [ ] Add `listRecent(limit?: number)` to fetch recent mock sends.
- [ ] Add integration test to verify vendorReceiveService triggers in non-production.

## workerService.ts
- [ ] Add explicit environment check before calling leadService.sendLead() for redundancy.
- [ ] Add structured logging at key lifecycle points.
- [ ] Add retry suppression for repeated failures.
- [ ] Add try/catch resilience around DAO timeouts.
- [ ] Add audit trail for worker actions.
- [ ] Add `WORKER_DISABLED` environment override to globally pause dispatch.
- [ ] Integrate redundant vendor-safe logic to ensure protection even if leadService changes.

## jobService.ts
- [ ] Add environment guard to block jobs in dev mode unless explicitly allowed.
- [ ] Add `jobDAO.updateJobError()` to persist job failure details.
- [ ] Replace console logs with structured logging.
- [ ] Await `handler.execute()` to ensure job completion before marking success.
- [ ] Move job handler registration to configuration or decorator pattern.
- [ ] Externalize hardcoded time buffer (-30s) into configuration.
- [ ] Implement actual `getWorkerId()` logic for instance identification.

## settingsService.ts
- [ ] Add environment guard to prevent writes in read-only environments.
- [ ] Add structured logging for create/update operations.
- [ ] Add validation for business hour and cron syntax.
- [ ] Unify redundant logic with `workerService` (e.g., updateNextLeadTime).
- [ ] Implement distributed `getWorkerId()` resolution mechanism.

## campaignService.ts
- [ ] Add transaction safety for batch creation during imports.
- [ ] Add structured logging when new campaigns are created dynamically.
- [ ] Add environment awareness to disable auto-creation in production.
- [ ] Implement optional caching for frequent `getByAffiliateId` calls.
- [ ] Add try/catch handling for DAO insert/update errors.

## affiliateService.ts
- [ ] Add transaction safety for mass affiliate creation.
- [ ] Add structured logging when affiliates are auto-created.
- [ ] Add environment guard to prevent test imports in production.
- [ ] Add validation for affiliate name format.
- [ ] Move case normalization logic into a shared helper (e.g., normalizeName()).

## investorService.ts
- [ ] Add transaction safety for batch investor creation during imports.
- [ ] Add structured logging for investor creation events.
- [ ] Add environment guard to prevent accidental inserts in production test runs.
- [ ] Implement cooldown/whitelist enforcement logic.
- [ ] Move case normalization logic to shared helper (reuse with affiliateService).

## countyService.ts
- [ ] Add transaction wrapping for county imports.
- [ ] Replace console logs with structured logging.
- [ ] Add CSV header validation.
- [ ] Add environment guard to prevent imports in production.
- [ ] Move normalization logic to shared utility.
- [ ] Implement caching for frequent lookups.

## leadFormInputService.ts
- [ ] Add structured logging for CRUD operations.
- [ ] Add deeper validation for input data fields.
- [ ] Add environment guard to prevent deletions in production.
- [ ] Add batch create/update support for multi-lead imports.
- [ ] Wrap DAO calls in try/catch for safer error handling.

## countyResource.ts
- [ ] Add validation for CSV file content and headers.
- [ ] Replace console logging with structured logger.
- [ ] Add consistent error handling across all routes.
- [ ] Implement pagination bounds validation.
- [ ] Add optional rate limiting for import endpoint.

## campaignResource.ts
- [ ] Add try/catch error handling for all routes.
- [ ] Add validation for parameters and request bodies.
- [ ] Implement structured logging for campaign updates.
- [ ] Enforce pagination limits (e.g., max 100).
- [ ] Add optional role-based admin authorization middleware.

## investorResource.ts
- [ ] Rename route params from `affiliateId` to `investorId`.
- [ ] Add try/catch blocks for all async routes.
- [ ] Add validation for request bodies and params.
- [ ] Implement structured logging for update actions.
- [ ] Enforce pagination limits (e.g., 100 max).

## leadResource.ts
- [ ] Implement real `sendLeadWithDelay()` logic integrated with workerService.
- [ ] Add schema validation for request bodies and query params.
- [ ] Enforce admin-only access for `/admin/send` route.
- [ ] Add structured logging instead of console.error.
- [ ] Add pagination limit enforcement (max 100).
- [ ] Implement rate limiting for manual send triggers.

## leadFormInputResource.ts
- [ ] Add input validation for request bodies using schema enforcement.
- [ ] Replace console.error with structured logging (pino/winston).
- [ ] Add fine-grained authorization for delete/update routes.
- [ ] Return 404 for non-existent lead IDs.
- [ ] Implement rate limiting for create/update endpoints.

## sendLogResource.ts
- [ ] Add try/catch blocks for all async routes or integrate centralized error handler.
- [ ] Add validation for query parameters and logId path variable.
- [ ] Implement structured logging for log updates and queries.
- [ ] Enforce pagination limits (e.g., limit <= 200).
- [ ] Add admin role validation for PATCH route.

## settingsResource.ts
- [ ] Add schema validation for `/admin/update` request body.
- [ ] Add structured error handling or global middleware.
- [ ] Implement structured logging for settings updates.
- [ ] Add admin-only guard for `/admin/update` route.
- [ ] Track version history of configuration changes.

## workerResource.ts
- [ ] Add admin role-based access control for `/admin/*` endpoints.
- [ ] Implement structured logging for start/stop/update actions.
- [ ] Add validation for `leadId` and `cron_schedule` inputs.
- [ ] Add rate limiting for `/admin/send-now` route.
- [ ] Track audit trail for worker configuration changes.

## jobResource.ts
- [ ] Add try/catch or global error handling for all routes.
- [ ] Implement schema validation for job creation and update payloads.
- [ ] Replace console logging with structured logging.
- [ ] Add admin-only enforcement for `run`, `delete`, and `update` endpoints.
- [ ] Track audit metadata (creator, modifier, executor).
- [ ] Add pagination for job listing endpoint.

## userResource.ts
- [ ] Add try/catch error handling for safety.
- [ ] Add null-check for `req.user` to avoid runtime errors.
- [ ] Implement structured logging for traceability.
- [ ] Add optional endpoints for profile update and user listing (admin).
- [ ] Prepare for role-based permission system integration.

## vendorReceiveResource.ts
- [ ] Add vendor API key or signature authentication.
- [ ] Implement strict schema validation for lead payloads.
- [ ] Replace console.error with structured logging.
- [ ] Add rate limiting and throttling to `/` route.
- [ ] Record metadata (timestamp, vendor ID, IP) for ingestion tracking.