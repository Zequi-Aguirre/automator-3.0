# Full Impact Analysis

## 1. Database Layer (postgres/migrations/)

### Tables Directly Affected

| Table | Change Type | Details |
|-------|-------------|---------|
| ⭐ **buyers** | NEW | Priority-based buyer configs with per-buyer timing (NO separate schedule table) |
| ⭐ **lead_buyer_outcomes** | NEW | Many-to-many sold status tracking |
| ✅ **send_log** | MODIFY | Add `buyer_id` FK (append-only, NO unique constraints) |
| ✅ **leads** | MODIFY | Add `worker_enabled` boolean, remove `investor_id` FK (after migration) |
| ✅ **worker_settings** | MODIFY | Remove `delay_same_investor/county/state`, `send_next_lead_at` |
| ⚠️ **investors** | DEPRECATE | Soft-deprecate, then drop (Stage 5) |
| ⚠️ **vendors** | DEPRECATE | Merge into buyers OR drop |

### Tables Unchanged

- ✅ **affiliates**: No changes
- ✅ **campaigns**: No changes
- ✅ **counties**: No changes
- ✅ **users**: No changes
- ✅ **jobs**: No changes
- ✅ **lead_form_inputs**: No changes
- ✅ **vendor_receives**: Keep for testing (mock endpoint)

---

## 2. Backend Data Layer (server/src/main/data/)

### DAOs to Create

| File | Purpose |
|------|---------|
| ⭐ `buyerDAO.ts` | CRUD for buyers table, priority queries, auth token encryption/decryption |
| ⭐ `leadBuyerOutcomeDAO.ts` | CRUD for sold status per buyer |

### DAOs to Modify

| File | Changes |
|------|---------|
| ✅ `sendLogDAO.ts` | Add `buyer_id` queries, `getByLeadIdGroupedByBuyer()`, `wasSuccessfullySentToBuyer()` |
| ✅ `leadDAO.ts` | Remove `investor_id` references (after migration), add `worker_enabled` queries |
| ✅ `workerSettingsDAO.ts` | Remove `updateNextLeadTime()`, remove cooldown methods |

### DAOs to Deprecate

| File | Action |
|------|--------|
| ⚠️ `investorDAO.ts` | Mark deprecated, remove after Stage 5 |

---

## 3. Backend Service Layer (server/src/main/services/)

### Services to Create

| File | Type | Purpose |
|------|------|---------|
| ⭐ `buyerService.ts` | Entity Service | Buyers CRUD, `getByPriority()`, `getAutoSendBuyers()` |
| ⭐ `buyerDispatchService.ts` | Orchestrator | Priority dispatch, validation, scheduling, `allow_resell` logic |

### Services to Refactor (Major Changes)

| File | Changes |
|------|---------|
| ✅ `leadService.ts` | Remove `investor_id` in import, add `sendLeadToBuyer()`, `getBuyerSendHistory()`, `markSoldToBuyer()` |
| ✅ `workerService.ts` | **Complete rewrite**: remove `applyFilters()`, `pickLeadForWorker()`, add `processAllBuyers()`, check `worker_enabled` |

### Services to Deprecate

| File | Action |
|------|--------|
| ⚠️ `investorService.ts` | Mark deprecated, remove after Stage 5 |

---

## 4. Backend Resources (server/src/main/resources/)

### Resources to Create

| File | Routes |
|------|--------|
| ⭐ `buyerResource.ts` | `GET/POST/PUT/DELETE /api/buyers`, admin only |

### Resources to Modify

| File | New Endpoints |
|------|---------------|
| ✅ `leadResource.ts` | `POST /api/leads/:id/send-to-buyer`, `GET /api/leads/:id/buyers`, `POST /api/leads/:id/enable-worker`, `POST /api/leads/:id/buyers/:buyerId/sold` |
| ✅ `workerResource.ts` | `POST /api/worker/force-send` (add `buyerId` param), `GET /api/worker/buyers/status` |

### Resources to Deprecate

| File | Action |
|------|--------|
| ⚠️ `investorResource.ts` | Mark deprecated, remove after Stage 5 |

---

## 5. Backend Vendor Layer (server/src/main/vendor/)

### Current State
- `iSpeedToLeadIAO.ts`: Hardcoded vendor with fixed URL

### New Abstraction

| File | Purpose |
|------|---------|
| ⭐ `buyerWebhookAdapter.ts` | Generic HTTP client, flexible auth (custom header name + prefix + encrypted token), dynamic URLs |

### Migration Path
1. Keep `iSpeedToLeadIAO.ts` temporarily
2. Create first buyer record from iSpeedToLead config
3. Switch worker to `buyerWebhookAdapter`
4. Delete `iSpeedToLeadIAO.ts` after validation

---

## 6. Backend Worker (server/src/main/worker/)

### Major Refactor

| File | Changes |
|------|---------|
| ✅ `Worker.ts` | Cron job remains same, but calls new worker logic |
| ✅ `SendLeadsJob.ts` | Old: `sendNextLead()`, New: Loop through worker buyers, check `worker_enabled` on leads |

### New Worker Logic

```
On each cron tick:
  For each buyer WHERE dispatch_mode IN ('worker','both') AND auto_send=true:
    If buyer.next_send_at <= NOW():
      1. Get eligible leads WHERE worker_enabled=true AND not sent to this buyer
      2. Select one lead (with locking)
      3. Send to buyer.webhook_url
      4. Log to send_log
      5. Schedule next: buyer.next_send_at = NOW() + random(min_minutes, max_minutes)
```

---

## 7. Backend Types (server/src/main/types/)

### New Type Files

| File | Types |
|------|-------|
| ⭐ `buyerTypes.ts` | `Buyer`, `BuyerCreateDTO`, `BuyerFilters`, `BuyerAuthConfig` |
| ⭐ `leadBuyerOutcomeTypes.ts` | `LeadBuyerOutcome`, `OutcomeCreateDTO` |

### Modified Type Files

| File | Changes |
|------|---------|
| ✅ `leadTypes.ts` | Add `worker_enabled`, remove `investor_id` from `Lead` type (after migration) |
| ✅ `sendLogTypes.ts` | Add `buyer_id`, `buyer_name` fields |
| ✅ `settingsTypes.ts` | Remove `delay_same_investor/county/state`, `send_next_lead_at` |

---

## 8. Frontend (client/src/)

### New Components

| Path | Purpose |
|------|---------|
| ⭐ `components/admin/adminBuyersSection/` | Buyers CRUD table, create/edit modals |
| ⭐ `components/common/leadDetails/buyerSendModal/` | Buyer send history + manual send buttons + sold toggles |

### Modified Components

| Path | Changes |
|------|---------|
| ✅ `components/admin/adminLeadsTable/` | Add "Buyers" column/action, add "Send to Worker" button |
| ✅ `components/common/leadDetails/` | Add buyer modal trigger |
| ✅ `components/common/importLeadsDialog/` | Remove investor assignment |

### New Services

| File | Purpose |
|------|---------|
| ⭐ `services/buyerService.ts` | API client for buyers CRUD |

### Modified Services

| File | New Methods |
|------|-------------|
| ✅ `services/leadService.ts` | `sendToBuyer(leadId, buyerId)`, `getBuyerHistory(leadId)`, `enableWorker(leadId)`, `markSold(leadId, buyerId)` |

### Deprecated Components

| Path | Action |
|------|--------|
| ⚠️ `components/admin/adminInvestorsSection/` | Mark deprecated, remove after Stage 5 |

---

## 9. Configuration (server/src/main/config/)

### Environment Variables

| Variable | Change |
|----------|--------|
| ⚠️ `LEAD_VENDOR_URL` | Remove (replaced by `buyer.webhook_url` in DB) |
| ✅ `LEAD_INTAKE_API_KEY` | Keep (for `/api/leads-intake` endpoint) |
| ⭐ `BUYER_AUTH_ENCRYPTION_KEY` | NEW (for encrypting `buyer.auth_token_encrypted` - 64-char hex) |

---

## 10. Files Summary

### Files to Create (14 files)

**Backend**:
- `server/src/main/data/buyerDAO.ts`
- `server/src/main/data/leadBuyerOutcomeDAO.ts`
- `server/src/main/services/buyerService.ts`
- `server/src/main/services/buyerDispatchService.ts`
- `server/src/main/resources/buyerResource.ts`
- `server/src/main/vendor/buyerWebhookAdapter.ts`
- `server/src/main/types/buyerTypes.ts`
- `server/src/main/types/leadBuyerOutcomeTypes.ts`

**Frontend**:
- `client/src/services/buyerService.ts`
- `client/src/components/admin/adminBuyersSection/AdminBuyersSection.tsx`
- `client/src/components/admin/adminBuyersSection/adminBuyersTable/AdminBuyersTable.tsx`
- `client/src/components/common/leadDetails/buyerSendModal/BuyerSendModal.tsx`
- `client/src/components/common/leadDetails/buyerSendModal/BuyerSendHistoryTable.tsx`
- `client/src/views/adminViews/AdminBuyersView.tsx`

### Files to Modify (15 files)

**Backend**:
- `server/src/main/data/sendLogDAO.ts`
- `server/src/main/data/leadDAO.ts`
- `server/src/main/data/workerSettingsDAO.ts`
- `server/src/main/services/leadService.ts`
- `server/src/main/services/workerService.ts` *(complete rewrite)*
- `server/src/main/resources/leadResource.ts`
- `server/src/main/resources/workerResource.ts`
- `server/src/main/worker/jobs/SendLeadsJob.ts`
- `server/src/main/types/leadTypes.ts`
- `server/src/main/types/sendLogTypes.ts`
- `server/src/main/types/settingsTypes.ts`
- `server/src/main/config/envConfig.ts`
- `server/src/main/AutomatorServer.ts` *(route registration)*

**Frontend**:
- `client/src/services/leadService.ts`
- `client/src/components/common/leadsSection/leadsTable/LeadsTable.tsx`

### Files to Remove (6 files, after Stage 5)

**Backend**:
- `server/src/main/data/investorDAO.ts`
- `server/src/main/services/investorService.ts`
- `server/src/main/resources/investorResource.ts`
- `server/src/main/vendor/iSpeedToLeadIAO.ts`
- `server/src/main/types/investorTypes.ts`

**Frontend**:
- `client/src/components/admin/adminInvestorsSection/` *(entire folder)*

### Database Migrations (5 files)

- `postgres/migrations/YYYYMMDD_01_create_buyers_and_outcomes.sql`
- `postgres/migrations/YYYYMMDD_02_extend_send_log_and_leads.sql`
- `postgres/migrations/YYYYMMDD_03_add_ispeedtolead_buyer.sql`
- `postgres/migrations/YYYYMMDD_04_remove_global_send_timing.sql`
- `postgres/migrations/YYYYMMDD_05_remove_investors.sql` *(irreversible)*

---

## Impact Summary

| Layer | Files Created | Files Modified | Files Removed | Total Impact |
|-------|---------------|----------------|---------------|--------------|
| Database | 2 tables | 2 tables | 2 tables | 5 migrations |
| Backend DAOs | 2 | 3 | 1 | 6 files |
| Backend Services | 2 | 2 | 1 | 5 files |
| Backend Resources | 1 | 2 | 1 | 4 files |
| Backend Worker | 0 | 2 | 0 | 2 files |
| Backend Vendor | 1 | 0 | 1 | 2 files |
| Backend Types | 2 | 3 | 1 | 6 files |
| Backend Config | 0 | 2 | 0 | 2 files |
| Frontend Components | 6 | 2 | 1 folder | 9 files |
| Frontend Services | 1 | 1 | 0 | 2 files |
| **TOTAL** | **17** | **19** | **9** | **45 files** |

**Complexity Rating**: ⚠️ **HIGH** - This is a major architectural refactor touching 45+ files across all layers.
