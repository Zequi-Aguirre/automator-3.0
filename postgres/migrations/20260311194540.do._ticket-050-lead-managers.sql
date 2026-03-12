-- Migration: TICKET-050 — Lead managers + drop sources.email
-- Date: 2026-03-11
--
-- Zero-downtime strategy:
--   This migration runs as a pre-deploy command before the new code starts.
--   All changes are either additive (new table, nullable column) or
--   removing a column no longer used by the new code.
--   The brief window where old code runs against the new schema is
--   acceptable on staging; for production, split into two deployments.

-- ============================================================
-- 1. Drop email from sources
--    Sources are lead channels (Facebook, CSV Import, etc.) — not people.
--    Email never belonged here.
-- ============================================================
ALTER TABLE sources DROP COLUMN IF EXISTS email;

-- ============================================================
-- 2. Create lead_managers table
--    Tracks who is responsible for each campaign (the person, not the channel).
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_managers (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name     TEXT NOT NULL,
    email    TEXT,
    phone    TEXT,
    active   BOOLEAN NOT NULL DEFAULT true,
    notes    TEXT,
    created  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_managers_active
    ON lead_managers(active)
    WHERE active = true AND deleted IS NULL;

CREATE OR REPLACE FUNCTION update_lead_managers_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lead_managers_modified ON lead_managers;
CREATE TRIGGER trigger_lead_managers_modified
    BEFORE UPDATE ON lead_managers
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_managers_modified();

-- ============================================================
-- 3. Link campaigns to managers (nullable — existing campaigns unaffected)
-- ============================================================
ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS lead_manager_id UUID
        REFERENCES lead_managers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_lead_manager_id
    ON campaigns(lead_manager_id)
    WHERE lead_manager_id IS NOT NULL;
