-- Undo Migration: Remove external campaign tracking
-- Ticket: TICKET-047
-- Date: 2026-03-02

-- ============================================================
-- 1. Remove Counties Table Changes
-- ============================================================

DROP INDEX IF EXISTS idx_counties_zip_codes;
ALTER TABLE counties DROP COLUMN IF EXISTS zip_codes;

-- ============================================================
-- 2. Remove Leads Table Changes
-- ============================================================

DROP INDEX IF EXISTS idx_leads_raw_payload;
DROP INDEX IF EXISTS idx_leads_external_unique;

ALTER TABLE leads DROP COLUMN IF EXISTS raw_payload;
ALTER TABLE leads DROP COLUMN IF EXISTS external_ad_name;
ALTER TABLE leads DROP COLUMN IF EXISTS external_ad_id;
ALTER TABLE leads DROP COLUMN IF EXISTS external_lead_id;

-- ============================================================
-- 3. Remove Campaigns Table Changes
-- ============================================================

DROP INDEX IF EXISTS idx_campaigns_platform;
DROP INDEX IF EXISTS idx_campaigns_external_unique;

ALTER TABLE campaigns DROP COLUMN IF EXISTS external_adset_name;
ALTER TABLE campaigns DROP COLUMN IF EXISTS external_adset_id;
ALTER TABLE campaigns DROP COLUMN IF EXISTS external_form_id;
ALTER TABLE campaigns DROP COLUMN IF EXISTS external_campaign_name;
ALTER TABLE campaigns DROP COLUMN IF EXISTS external_campaign_id;
ALTER TABLE campaigns DROP COLUMN IF EXISTS platform;
