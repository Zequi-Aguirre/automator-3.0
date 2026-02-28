-- Migration: Fix priority unique constraint to allow reuse after soft-delete
-- Description: Replace UNIQUE constraint with partial unique index (WHERE deleted IS NULL)
--              This allows priority reuse after a buyer is soft-deleted

-- ========================================
-- UP Migration
-- ========================================

-- Drop the existing unique constraint on priority
ALTER TABLE buyers DROP CONSTRAINT IF EXISTS buyers_priority_key;

-- Create partial unique index that only enforces uniqueness for non-deleted buyers
CREATE UNIQUE INDEX idx_buyers_priority_unique
ON buyers(priority)
WHERE deleted IS NULL;

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_buyers_priority_unique;
-- ALTER TABLE buyers ADD CONSTRAINT buyers_priority_key UNIQUE (priority);
