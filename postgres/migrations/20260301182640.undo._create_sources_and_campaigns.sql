-- Rollback Migration: Undo sources and campaigns changes
-- Ticket: TICKET-046
-- Date: 2026-03-01
-- Description: Reverts source-specific API key authentication system

-- ============================================================
-- 1. Remove leads.source_id column
-- ============================================================

-- Drop foreign key constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS fk_leads_source;

-- Drop index
DROP INDEX IF EXISTS idx_leads_source_id;

-- Drop column
ALTER TABLE leads DROP COLUMN IF EXISTS source_id;

-- ============================================================
-- 2. Revert campaigns table changes
-- ============================================================

-- Drop source-related indexes
DROP INDEX IF EXISTS idx_campaigns_name;
DROP INDEX IF EXISTS idx_campaigns_source_id;

-- Drop source foreign key constraint
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS fk_campaigns_source;

-- Drop source_id column
ALTER TABLE campaigns DROP COLUMN IF EXISTS source_id;

-- Re-add affiliate_id column (pointing to affiliates table that was dropped)
-- Note: This will fail if affiliates table doesn't exist
-- ALTER TABLE campaigns ADD COLUMN affiliate_id UUID;

-- Note: Cannot restore affiliate_id FK because affiliates table was dropped
-- in migration 20260228180801. To fully rollback, you would need to
-- rollback that migration first.

-- ============================================================
-- 3. Drop sources table
-- ============================================================

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_sources_modified ON sources;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_sources_modified();

-- Drop indexes
DROP INDEX IF EXISTS idx_sources_active;
DROP INDEX IF EXISTS idx_sources_token;

-- Drop table (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS sources CASCADE;

-- ============================================================
-- WARNINGS
-- ============================================================

-- WARNING: This rollback does NOT restore affiliate_id to campaigns
-- because the affiliates table was dropped in a previous migration.
-- To fully restore the previous state, you would need to rollback
-- migration 20260228180801 first.
--
-- Data Loss:
-- - All sources will be deleted
-- - All API tokens will be lost
-- - Lead source associations will be removed
-- - Campaign source associations will be removed
