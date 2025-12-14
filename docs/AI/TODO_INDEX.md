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