-- Migration: Add allow_resell to lead_buyer_outcomes
-- Description: Captures buyer's allow_resell setting at time of sale
--              Prevents dynamic resell availability when buyer settings change
--              If lead sold with allow_resell=false, it stays blocked even if buyer setting changes

-- ========================================
-- UP Migration
-- ========================================

-- Add allow_resell to outcomes (defaults to true for backward compatibility)
ALTER TABLE lead_buyer_outcomes
ADD COLUMN allow_resell BOOLEAN DEFAULT true;

-- Backfill existing records with buyer's current allow_resell setting
UPDATE lead_buyer_outcomes lbo
SET allow_resell = b.allow_resell
FROM buyers b
WHERE lbo.buyer_id = b.id;

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
-- ALTER TABLE lead_buyer_outcomes DROP COLUMN IF EXISTS allow_resell;
