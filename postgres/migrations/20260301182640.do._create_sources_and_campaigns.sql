-- Migration: Create sources and campaigns tables for API authentication
-- Ticket: TICKET-046
-- Date: 2026-03-01
-- Description: Implements source-specific API key authentication system
--              Each source gets a unique token for API access
--              Campaigns belong to sources and track marketing campaigns
--              Leads get associated with source via campaign

-- ============================================================
-- 1. Create sources table
-- ============================================================

CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted TIMESTAMPTZ  -- Soft delete column
);

-- Unique constraint on token
ALTER TABLE sources ADD CONSTRAINT sources_token_unique UNIQUE (token);

-- Index for fast token lookups (excluding soft-deleted records)
CREATE INDEX idx_sources_token ON sources(token)
    WHERE deleted IS NULL;

-- Index for listing active sources
CREATE INDEX idx_sources_active ON sources(id)
    WHERE deleted IS NULL;

-- Auto-update modified timestamp trigger
CREATE OR REPLACE FUNCTION update_sources_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sources_modified
    BEFORE UPDATE ON sources
    FOR EACH ROW
    EXECUTE FUNCTION update_sources_modified();

-- ============================================================
-- 2. Update campaigns table (already exists from earlier migration)
-- ============================================================

-- Drop old affiliate foreign key constraint
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS fk_affiliate;

-- Drop old affiliate reference (will be replaced by source)
-- Note: affiliates table was dropped in migration 20260228180801
ALTER TABLE campaigns DROP COLUMN IF EXISTS affiliate_id;

-- Add source_id column
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS source_id UUID;

-- Make source_id NOT NULL after adding it (existing rows will need to be handled)
-- For now, allow NULL for existing campaigns
ALTER TABLE campaigns ALTER COLUMN source_id DROP NOT NULL;

-- Add foreign key constraint to sources
ALTER TABLE campaigns
    ADD CONSTRAINT fk_campaigns_source
    FOREIGN KEY (source_id)
    REFERENCES sources(id)
    ON DELETE RESTRICT;

-- Drop old UNIQUE constraint on name (campaigns are now unique within source, not globally)
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_name_key;

-- Index for source-to-campaigns lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_source_id ON campaigns(source_id)
    WHERE deleted IS NULL;

-- Index for name lookups within a source
CREATE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(source_id, name)
    WHERE deleted IS NULL;

-- Auto-update modified timestamp trigger (may already exist)
CREATE OR REPLACE FUNCTION update_campaigns_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campaigns_modified ON campaigns;
CREATE TRIGGER trigger_campaigns_modified
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_modified();

-- ============================================================
-- 3. Update leads table
-- ============================================================

-- Add source_id column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_id UUID;

-- Add foreign key constraint
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_source
    FOREIGN KEY (source_id)
    REFERENCES sources(id)
    ON DELETE SET NULL;

-- Index for lead-to-source joins
CREATE INDEX idx_leads_source_id ON leads(source_id)
    WHERE source_id IS NOT NULL;

-- ============================================================
-- NOTES
-- ============================================================

-- Token Format:
--   - 64-character hexadecimal string (32 random bytes)
--   - Generated using crypto.randomBytes(32).toString('hex')
--   - Stored in plaintext (high-entropy tokens don't require encryption)
--
-- Campaign Tracking:
--   - Campaigns are tracked by name within a source
--   - If source changes campaign name, it's treated as a new campaign
--   - This is intentional for tracking purposes
--
-- Lead Association:
--   - Leads link to campaign_id (already exists in leads table)
--   - Source derived via campaign.source_id relationship
--   - source_id on leads is denormalized for query performance
--
-- Soft Deletion:
--   - deleted IS NULL means active
--   - deleted = timestamp means soft-deleted
--   - Soft-deleted sources immediately fail authentication (WHERE deleted IS NULL)
--   - Referential integrity maintained for audit trail
--
-- Security:
--   - Tokens transmitted via Bearer authentication in Authorization header
--   - Always use HTTPS in production
--   - Tokens shown only once after generation/refresh
--   - Rate limiting enforced at application layer (600 leads/day per source)
