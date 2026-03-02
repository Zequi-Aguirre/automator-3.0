# TICKET-047: External Campaign Tracking & Raw Payload Storage

**Type**: Enhancement
**Priority**: P1 (High - Required for proper Facebook lead tracking)
**Estimate**: 6-8 hours
**Created**: 2026-03-02
**Status**: 🔵 IN PROGRESS

## Overview

Implement comprehensive external platform tracking for campaigns and leads, with support for Facebook Lead Ads and future platforms (Google, TikTok, etc.). Store complete raw payloads for audit trail and future data extraction.

## Business Context

**Problem:**
- No way to track back to original Facebook campaigns/ads/forms
- Losing valuable metadata about lead source
- Cannot prevent duplicate lead ingestion from same platform
- Missing audit trail of original payload

**Solution:**
- Add external platform identifiers to campaigns table
- Add external tracking fields to leads table
- Store complete raw payload as JSONB
- Implement zip code → county lookup (cheaper than AI)
- Auto-create campaigns by external_campaign_id + source_id

## Database Changes

### 1. Campaigns Table - Add External Tracking

```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platform VARCHAR(20); -- 'fb', 'google', 'tiktok', etc.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_campaign_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_campaign_name VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_form_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_adset_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_adset_name VARCHAR(255);

-- Unique constraint: One campaign per (source_id + external_campaign_id + platform)
-- This allows matching/auto-creation by external ID
CREATE UNIQUE INDEX idx_campaigns_external_unique
    ON campaigns(source_id, external_campaign_id, platform)
    WHERE deleted IS NULL AND external_campaign_id IS NOT NULL;

-- Index for platform queries
CREATE INDEX idx_campaigns_platform ON campaigns(platform)
    WHERE deleted IS NULL AND platform IS NOT NULL;
```

### 2. Leads Table - Add External Tracking & Raw Payload

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_lead_id VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_ad_id VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_ad_name VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Prevent duplicate leads from same platform + source
CREATE UNIQUE INDEX idx_leads_external_unique
    ON leads(source_id, external_lead_id)
    WHERE deleted IS NULL AND external_lead_id IS NOT NULL;

-- Index for raw_payload queries (using GIN for JSONB)
CREATE INDEX idx_leads_raw_payload ON leads USING GIN(raw_payload)
    WHERE raw_payload IS NOT NULL;
```

### 3. Counties Table - Add Zip Code Mapping

```sql
ALTER TABLE counties ADD COLUMN IF NOT EXISTS zip_codes TEXT[];

-- Index for zip code lookups
CREATE INDEX idx_counties_zip_codes ON counties USING GIN(zip_codes)
    WHERE zip_codes IS NOT NULL;
```

## API Changes

### Updated Payload Structure for Lead Intake

**Endpoint:** `POST /api/lead-intake/`
**Auth:** `Bearer <source_token>`

**Payload:**
```json
[
  {
    "lead": {
      "first_name": "David",
      "last_name": "Boggs",
      "email": "davidncarolboggs2017@gmail.com",
      "phone": "+13178012406",
      "address": "3602 fairground Drive Apt. J",
      "city": "Indianapolis",
      "state": "IN",
      "zip": "46229"
    },
    "campaign": {
      "platform": "fb",
      "external_campaign_id": "6900342307448",
      "external_campaign_name": "Illinois/ Indiana",
      "external_form_id": "1238806368373833",
      "external_adset_id": "6900342307048",
      "external_adset_name": "New Leads Ad Set"
    },
    "metadata": {
      "external_lead_id": "905942839095356",
      "external_ad_id": "6900342307248",
      "external_ad_name": "Illinois/ Indiana",
      "page_id": "934508059746714",
      "inbox_url": "https://business.facebook.com/latest/25881978528150727",
      "date_created": "2026-03-02T16:05:41.000Z",
      "is_organic": false
    },
    "raw_payload": {
      /* Complete original Facebook payload */
    }
  }
]
```

**Backwards Compatibility:**
- Old payload structure still works (just `campaign_name` field)
- New structure preferred for external tracking

### Campaign Matching Logic

**Match Priority:**
1. If `external_campaign_id` provided → Match by `(source_id, external_campaign_id, platform)`
2. If no match found → Auto-create campaign with all external fields
3. If only `campaign_name` provided (legacy) → Match/create by name only

## Implementation Tasks

### Phase 1: Database Schema (1-2 hours)
- [ ] Create migration `20260302_add_external_campaign_tracking.sql`
- [ ] Add external fields to campaigns table
- [ ] Add external fields and raw_payload to leads table
- [ ] Add zip_codes array to counties table
- [ ] Add indexes for performance
- [ ] Test migration up/down

### Phase 2: Type Definitions (30 min)
- [ ] Update `Campaign` type in `campaignTypes.ts`
- [ ] Update `Lead` type in `leadTypes.ts`
- [ ] Create new `ExternalCampaignData` type
- [ ] Create new `ExternalLeadMetadata` type
- [ ] Update `ApiLeadPayload` type for new structure

### Phase 3: DAO Layer (1 hour)
- [ ] Update `CampaignDAO.getOrCreateByExternal()` - match by external_campaign_id
- [ ] Update `CampaignDAO.create()` - accept external fields
- [ ] Update `LeadDAO.create()` - accept external fields and raw_payload
- [ ] Add `CountyDAO.getByZipCode()` method

### Phase 4: Service Layer (2 hours)
- [ ] Update `CampaignService.getOrCreate()` - handle external matching
- [ ] Update `LeadService.importLeadsFromApi()` - handle new payload structure
- [ ] Add `CountyService.lookupByZipCode()` method
- [ ] Add duplicate detection by external_lead_id

### Phase 5: API Resource (1 hour)
- [ ] Update `LeadIntakeResource` to parse new payload structure
- [ ] Add validation for external fields
- [ ] Handle both old and new payload formats
- [ ] Add helpful error messages

### Phase 6: Testing & Documentation (2 hours)
- [ ] Test with Make.com webhook
- [ ] Test campaign auto-creation by external_campaign_id
- [ ] Test duplicate lead prevention
- [ ] Test county lookup by zip code
- [ ] Test raw_payload storage and retrieval
- [ ] Update API documentation
- [ ] Document Make.com payload mapping

## Acceptance Criteria

- [ ] Campaigns table has all external tracking fields
- [ ] Leads table has external_lead_id, external_ad_id, raw_payload
- [ ] Unique constraint prevents duplicate leads by (source_id, external_lead_id)
- [ ] Campaign matching works by external_campaign_id + source_id
- [ ] Campaigns auto-create with external metadata
- [ ] County lookup by zip code works
- [ ] Raw payload stored as JSONB and retrievable
- [ ] Lead intake accepts new payload structure
- [ ] Lead intake still accepts old payload structure (backwards compatible)
- [ ] Duplicate leads return helpful error message
- [ ] Migration runs successfully both up and down

## Files Affected

**Database:**
- `postgres/migrations/20260302_add_external_campaign_tracking.sql` (NEW)

**Types:**
- `server/src/main/types/campaignTypes.ts` (UPDATE)
- `server/src/main/types/leadTypes.ts` (UPDATE)

**DAOs:**
- `server/src/main/data/campaignDAO.ts` (UPDATE)
- `server/src/main/data/leadDAO.ts` (UPDATE)
- `server/src/main/data/countyDAO.ts` (UPDATE)

**Services:**
- `server/src/main/services/campaignService.ts` (UPDATE)
- `server/src/main/services/leadService.ts` (UPDATE)
- `server/src/main/services/countyService.ts` (UPDATE)

**Resources:**
- `server/src/main/resources/leadIntakeResource.ts` (UPDATE)

## Testing Notes

**Test Cases:**
1. Send lead with full Facebook metadata → Should store all fields
2. Send duplicate lead (same external_lead_id) → Should reject with error
3. Send lead with new external_campaign_id → Should auto-create campaign
4. Send lead with existing external_campaign_id → Should reuse campaign
5. Send lead with only campaign_name (legacy) → Should still work
6. County lookup by zip code → Should find correct county
7. Query raw_payload → Should be searchable

**Make.com Setup:**
- Map Facebook fields to new structure
- Test with real Facebook lead
- Verify all metadata captured

## Recommended Payload Structure for Make

**In Make.com, map the Facebook Lead Ads trigger to:**

```javascript
{
  "lead": {
    "first_name": "{{firstName}}", // Parse from full_name
    "last_name": "{{lastName}}", // Parse from full_name
    "email": "{{email}}",
    "phone": "{{phone}}",
    "address": "{{street_address}}",
    "city": "{{city}}",
    "state": "{{state}}",
    "zip": "{{zip_code}}"
  },
  "campaign": {
    "platform": "fb",
    "external_campaign_id": "{{campaignId}}",
    "external_campaign_name": "{{campaignName}}",
    "external_form_id": "{{formId}}",
    "external_adset_id": "{{adsetId}}",
    "external_adset_name": "{{adsetName}}"
  },
  "metadata": {
    "external_lead_id": "{{leadgenId}}",
    "external_ad_id": "{{adId}}",
    "external_ad_name": "{{adName}}",
    "page_id": "{{pageId}}",
    "inbox_url": "{{inboxUrl}}",
    "date_created": "{{dateCreated}}",
    "is_organic": {{isOrganic}}
  },
  "raw_payload": {{entireFacebookPayload}} // Store complete original
}
```

## Future Enhancements

- [ ] Add Google Ads support (platform: 'google')
- [ ] Add TikTok support (platform: 'tiktok')
- [ ] Add analytics endpoint to query raw_payload
- [ ] Add webhook for duplicate lead detection
- [ ] Add UI to view raw payloads in lead details

## Related Tickets

- TICKET-046: Sources & Campaigns (Foundation for this work)
- TICKET-015: County matching validation (Enhanced by zip lookup)

## Notes

- **Name parsing in Make:** Use Make's text functions to split `full_name` into `first_name` and `last_name`
- **County lookup:** Zip code mapping is more accurate and cheaper than AI
- **Raw payload:** Complete audit trail for debugging and future feature extraction
- **Duplicate prevention:** Unique constraint on (source_id, external_lead_id) prevents double-charging
