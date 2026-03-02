-- Migration: Rename affiliate_id to source_id in send_log table
-- Ticket: TICKET-046
-- Date: 2026-03-01
-- Description: Updates send_log table to reference sources instead of affiliates

-- ============================================================
-- 1. Drop old foreign key constraint to affiliates table
-- ============================================================

ALTER TABLE send_log DROP CONSTRAINT IF EXISTS send_log_affiliate_id_fkey;

-- ============================================================
-- 2. Rename column from affiliate_id to source_id
-- ============================================================

ALTER TABLE send_log RENAME COLUMN affiliate_id TO source_id;

-- ============================================================
-- 3. Add foreign key constraint to sources table
-- ============================================================

ALTER TABLE send_log
    ADD CONSTRAINT send_log_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES sources(id)
    ON DELETE SET NULL;

-- ============================================================
-- NOTES
-- ============================================================

-- Purpose:
--   The send_log.affiliate_id column was storing source IDs after the
--   affiliates table was dropped in migration 20260228180801.
--   This migration properly renames the column and updates the FK constraint.
--
-- Data Preservation:
--   - Column rename preserves all existing data
--   - Existing source_id values remain intact
--   - ON DELETE SET NULL ensures logs are preserved even if source is deleted
