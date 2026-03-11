-- Migration: Add external campaign tracking and raw payload storage
-- Ticket: TICKET-047
-- Date: 2026-03-02
-- Description: Adds external platform tracking (Facebook, Google, TikTok, etc.)
--              to campaigns and leads tables, plus raw payload storage

-- ============================================================
-- 1. Campaigns Table - Add External Tracking Fields
-- ============================================================

-- Add platform identifier (fb, google, tiktok, etc.)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platform VARCHAR(20);

-- Add Facebook/external campaign tracking fields
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_campaign_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_campaign_name VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_form_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_adset_id VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_adset_name VARCHAR(255);

-- Unique constraint: One campaign per (source_id + external_campaign_id + platform)
-- This enables campaign matching/auto-creation by external ID
CREATE UNIQUE INDEX idx_campaigns_external_unique
    ON campaigns(source_id, external_campaign_id, platform)
    WHERE deleted IS NULL AND external_campaign_id IS NOT NULL;

-- Index for platform queries
CREATE INDEX idx_campaigns_platform ON campaigns(platform)
    WHERE deleted IS NULL AND platform IS NOT NULL;

-- ============================================================
-- 2. Leads Table - Add External Tracking & Raw Payload
-- ============================================================

-- Add external lead tracking fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_lead_id VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_ad_id VARCHAR(255);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_ad_name VARCHAR(255);

-- Add raw payload storage (complete original platform payload)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Prevent duplicate leads from same platform + source
-- This is critical for preventing double-charging on duplicate webhooks
CREATE UNIQUE INDEX idx_leads_external_unique
    ON leads(source_id, external_lead_id)
    WHERE deleted IS NULL AND external_lead_id IS NOT NULL;

-- Index for raw_payload queries (GIN index for JSONB operations)
CREATE INDEX idx_leads_raw_payload ON leads USING GIN(raw_payload)
    WHERE raw_payload IS NOT NULL;

-- ============================================================
-- 3. Counties Table - Add Zip Code Mapping
-- ============================================================

-- Add zip codes array for deterministic county lookup
ALTER TABLE counties ADD COLUMN IF NOT EXISTS zip_codes TEXT[];

-- GIN index for efficient zip code lookups using array contains operator
CREATE INDEX idx_counties_zip_codes ON counties USING GIN(zip_codes)
    WHERE zip_codes IS NOT NULL;

-- ============================================================
-- NOTES
-- ============================================================

-- External Campaign Matching:
--   - Campaigns matched by (source_id, external_campaign_id, platform)
--   - Auto-create if no match found
--   - Backwards compatible: campaign_name-only matching still works
--
-- Lead Deduplication:
--   - Unique constraint on (source_id, external_lead_id) prevents duplicates
--   - Returns helpful error if duplicate detected
--   - Only applies when external_lead_id is provided
--
-- Raw Payload Storage:
--   - Complete audit trail for debugging
--   - Future-proof for extracting new fields
--   - Searchable via JSONB operators
--
-- County Lookup by Zip:
--   - More accurate than AI-based lookup
--   - Free and deterministic
--   - Requires manual zip code data population
--
-- Platform Support:
--   - 'fb' = Facebook Lead Ads
--   - 'google' = Google Ads (future)
--   - 'tiktok' = TikTok Ads (future)
--   - Add more as needed
