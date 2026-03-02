-- Rollback Migration: Revert source_id to affiliate_id in send_log
-- Ticket: TICKET-046
-- Date: 2026-03-01

-- ============================================================
-- 1. Drop source FK constraint
-- ============================================================

ALTER TABLE send_log DROP CONSTRAINT IF EXISTS send_log_source_id_fkey;

-- ============================================================
-- 2. Rename column back to affiliate_id
-- ============================================================

ALTER TABLE send_log RENAME COLUMN source_id TO affiliate_id;

-- ============================================================
-- 3. Restore FK constraint to affiliates table
-- ============================================================

-- Note: This will fail if affiliates table doesn't exist
-- To fully rollback, you would need to rollback migration 20260228180801 first

-- ALTER TABLE send_log
--     ADD CONSTRAINT send_log_affiliate_id_fkey
--     FOREIGN KEY (affiliate_id)
--     REFERENCES affiliates(id)
--     ON DELETE SET NULL;

-- ============================================================
-- WARNING
-- ============================================================

-- This rollback does NOT restore the FK constraint to affiliates
-- because the affiliates table was dropped in migration 20260228180801.
-- The column will be renamed but will not have a FK constraint.
