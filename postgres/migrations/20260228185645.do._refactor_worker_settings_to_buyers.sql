-- Migration: Refactor worker settings - move cooldowns to per-buyer settings
-- Ticket: TICKET-019 (Sprint 3 Worker Refactor)
-- Description: Moves cooldown and state hold settings from global worker_settings to per-buyer configuration
--              Adds enforcement toggles for expiration, county cooldown, and state cooldown
--              Removes deprecated fields (investor delay, global timing, state holds)

-- ========================================
-- UP Migration
-- ========================================

-- ============================================================
-- Step 1: Add new fields to worker_settings
-- ============================================================

-- Add enforcement toggle for lead expiration
ALTER TABLE worker_settings
ADD COLUMN enforce_expiration BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- Step 2: Remove deprecated fields from worker_settings
-- ============================================================

-- Remove global timing fields (now per-buyer)
ALTER TABLE worker_settings
DROP COLUMN IF EXISTS send_next_lead_at;

ALTER TABLE worker_settings
DROP COLUMN IF EXISTS minutes_range_start;

ALTER TABLE worker_settings
DROP COLUMN IF EXISTS minutes_range_end;

-- Remove cooldown fields (moving to per-buyer)
ALTER TABLE worker_settings
DROP COLUMN IF EXISTS delay_same_state;

ALTER TABLE worker_settings
DROP COLUMN IF EXISTS delay_same_county;

-- Remove investor delay (deprecated - investors no longer used in worker)
ALTER TABLE worker_settings
DROP COLUMN IF EXISTS delay_same_investor;

-- Remove states_on_hold (moving to per-buyer)
ALTER TABLE worker_settings
DROP COLUMN IF EXISTS states_on_hold;

-- ============================================================
-- Step 3: Add new fields to buyers
-- ============================================================

-- Add state blocking per buyer
ALTER TABLE buyers
ADD COLUMN states_on_hold TEXT[] DEFAULT '{}';

-- Add cooldown settings per buyer
ALTER TABLE buyers
ADD COLUMN delay_same_county INTEGER DEFAULT 36;

ALTER TABLE buyers
ADD COLUMN delay_same_state INTEGER DEFAULT 0;

-- Add enforcement toggles per buyer
ALTER TABLE buyers
ADD COLUMN enforce_county_cooldown BOOLEAN DEFAULT true;

ALTER TABLE buyers
ADD COLUMN enforce_state_cooldown BOOLEAN DEFAULT false;

-- ============================================================
-- Step 4: Create indexes for new buyer fields
-- ============================================================

-- Index for state blocking lookups
CREATE INDEX idx_buyers_states_on_hold ON buyers USING GIN (states_on_hold);

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
--
-- -- Remove indexes
-- DROP INDEX IF EXISTS idx_buyers_states_on_hold;
--
-- -- Remove buyer fields
-- ALTER TABLE buyers DROP COLUMN IF EXISTS enforce_state_cooldown;
-- ALTER TABLE buyers DROP COLUMN IF EXISTS enforce_county_cooldown;
-- ALTER TABLE buyers DROP COLUMN IF EXISTS delay_same_state;
-- ALTER TABLE buyers DROP COLUMN IF EXISTS delay_same_county;
-- ALTER TABLE buyers DROP COLUMN IF EXISTS states_on_hold;
--
-- -- Restore worker_settings fields
-- ALTER TABLE worker_settings ADD COLUMN states_on_hold JSONB DEFAULT '[]';
-- ALTER TABLE worker_settings ADD COLUMN delay_same_investor INTEGER DEFAULT 16;
-- ALTER TABLE worker_settings ADD COLUMN delay_same_county INTEGER DEFAULT 36;
-- ALTER TABLE worker_settings ADD COLUMN delay_same_state INTEGER DEFAULT 0;
-- ALTER TABLE worker_settings ADD COLUMN minutes_range_end INTEGER;
-- ALTER TABLE worker_settings ADD COLUMN minutes_range_start INTEGER;
-- ALTER TABLE worker_settings ADD COLUMN send_next_lead_at TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE worker_settings DROP COLUMN IF EXISTS enforce_expiration;
