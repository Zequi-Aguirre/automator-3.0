-- Migration: Fix column naming in buyers and lead_buyer_outcomes tables
-- Description: Rename created_at -> created, modified_at -> modified, deleted_at -> deleted
--              to match codebase convention

-- ========================================
-- UP Migration
-- ========================================

-- Fix buyers table
ALTER TABLE buyers RENAME COLUMN created_at TO created;
ALTER TABLE buyers RENAME COLUMN modified_at TO modified;
ALTER TABLE buyers RENAME COLUMN deleted_at TO deleted;

-- Fix lead_buyer_outcomes table
ALTER TABLE lead_buyer_outcomes RENAME COLUMN created_at TO created;
ALTER TABLE lead_buyer_outcomes RENAME COLUMN modified_at TO modified;
ALTER TABLE lead_buyer_outcomes RENAME COLUMN deleted_at TO deleted;

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
-- ALTER TABLE buyers RENAME COLUMN created TO created_at;
-- ALTER TABLE buyers RENAME COLUMN modified TO modified_at;
-- ALTER TABLE buyers RENAME COLUMN deleted TO deleted_at;
--
-- ALTER TABLE lead_buyer_outcomes RENAME COLUMN created TO created_at;
-- ALTER TABLE lead_buyer_outcomes RENAME COLUMN modified TO modified_at;
-- ALTER TABLE lead_buyer_outcomes RENAME COLUMN deleted TO deleted_at;
