-- Migration: TICKET-075 — Add lead_manager_id to sources
-- Date: 2026-03-13
-- Description: Allows a source to be directly assigned to a lead manager

ALTER TABLE sources
    ADD COLUMN IF NOT EXISTS lead_manager_id UUID
        REFERENCES lead_managers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sources_lead_manager_id
    ON sources(lead_manager_id)
    WHERE lead_manager_id IS NOT NULL;
