-- Migration: Add buyer-affiliate blocking
-- Description: Allows buyers to blacklist specific affiliates to prevent receiving their leads
--              Use case: If a buyer also acts as an affiliate, don't send their own leads back to them

-- ========================================
-- UP Migration
-- ========================================

-- Add blocked_affiliate_ids to buyers table (array of affiliate IDs to block)
ALTER TABLE buyers
ADD COLUMN blocked_affiliate_ids UUID[] DEFAULT '{}';

-- Create GIN index for fast array containment checks
CREATE INDEX idx_buyers_blocked_affiliates ON buyers USING GIN (blocked_affiliate_ids);

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_buyers_blocked_affiliates;
-- ALTER TABLE buyers DROP COLUMN IF EXISTS blocked_affiliate_ids;
