# AskZack DAO Summary (v1)

This document summarizes the Data Access Object (DAO) layer of the AskZack backend. Each DAO below implements the conventions and safety policies defined in `DAO_CONTRACT.md`.

---

## affiliateDAO.ts
**Entity:** `affiliates`
- Provides CRUD operations for affiliate records.
- Enforces `deleted IS NULL` soft-delete filtering.
- Uses dynamic `SET` clause builder for partial updates.
- Safe parameterized queries via pg-promise.
- Consistency: compliant with null-handling policy.
- Note: `getManyByIds()` and `getAffiliatesByIds()` duplicate logic.

---

## campaignDAO.ts
**Entity:** `campaigns`
- Manages campaign records linked to `affiliates` via `affiliate_id`.
- Supports pagination and filtering.
- Uses soft-delete pattern and dynamic updates.
- Parameterized SQL; safe and consistent.
- Minor schema prefix inconsistency (`public."campaigns"`).
- Suggests BaseDAO abstraction for pagination.

---

## countyDAO.ts
**Entity:** `counties`
- Handles county reference data and import support.
- Includes search, pagination, and blacklist toggling.
- Search uses unsafe string interpolation (to be parameterized).
- Fully soft-delete aware and null-safe.
- Suggests BaseDAO abstraction for filtering logic.

---

## investorDAO.ts
**Entity:** `investors`
- Mirrors affiliate/campaign schema with rating, blacklist, and whitelist.
- Safe SQL and consistent update semantics.
- Dynamic SET builder for partial updates.
- Suggests shared helper for pagination and update assembly.

---

## jobDAO.ts
**Entity:** `jobs`
- Manages background job scheduling and lifecycle.
- Supports create, update, pause/resume, soft-delete.
- Uses NOW() for timestamping (should be centralized).
- Contains temporary hardcoded worker ID (TODO fix).
- Clean and consistent with null-handling policy.

---

## leadDAO.ts
**Entity:** `leads`
- Most complex DAO: full lead lifecycle (insert, update, verify, delete).
- Implements CSV ingestion and status management.
- Safe and null-compliant.
- Suggests optimization for batch inserts and modular filters.
- Core to vendor dispatch and worker scheduling.

---

## leadFormInputDAO.ts
**Entity:** `lead_form_inputs`
- Stores structured form data for leads.
- Uses merge update pattern to prevent null overwrites.
- Soft-delete aware and explicit in field updates.
- Update logic verbose; should adopt shared dynamic builder.

---

## sendLogDAO.ts
**Entity:** `send_log`
- Logs outbound vendor communication attempts.
- Joins with `leads` for relational queries.
- Fully parameterized, safe, and soft-delete compliant.
- Repeated JOIN logic could be centralized.
- Potential performance optimization with COUNT(*) queries.

---

## userDAO.ts
**Entity:** `users`
- Provides read access for authentication.
- Missing soft-delete awareness.
- No CRUD or timestamp support yet.
- Safe parameterized reads for login and auth middleware.

---

## vendorReceiveDAO.ts
**Entity:** `vendor_receives`
- Logs raw vendor payloads during development mode.
- Single insert method; no retrieval or cleanup yet.
- Forms the core of local vendor-safe simulation behavior.
- Tied to LOCAL_DEV_BEHAVIOR.md policy.

---

## workerSettingsDAO.ts
**Entity:** `worker_settings`
- Controls automation and lead dispatch timing.
- Manages business hours, cron schedules, and worker status.
- Merge update logic consistent and null-safe.
- Integrates indirectly with lead/vendor dispatch logic.
- Key to enforcing environment-aware send safeguards.

---

## General DAO Standards
- All DAOs must use parameterized pg-promise queries.
- Enforce `deleted IS NULL` soft-delete convention.
- Disallow direct null assignments in updates.
- Use NOW() or toggle functions for timestamp changes.
- Maintain consistent error handling structure.
- Apply dependency injection via DBContainer.

---

## Update Policy
Whenever a DAO’s core logic, schema, or update pattern changes, this file must be updated to reflect the change.
This ensures AskZack’s architectural understanding of the data layer remains accurate.