-- Migration: Replace dispatch_mode enum with manual_send + worker_send booleans
-- Also adds buyer routing filters to counties (same pattern as sources)

-- ============================================================
-- 1. Buyers: replace dispatch_mode with manual_send + worker_send
-- ============================================================

ALTER TABLE buyers
    ADD COLUMN manual_send BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN worker_send BOOLEAN NOT NULL DEFAULT true;

-- Backfill from existing dispatch_mode values
UPDATE buyers SET manual_send = true,  worker_send = false WHERE dispatch_mode = 'manual';
UPDATE buyers SET manual_send = false, worker_send = true  WHERE dispatch_mode = 'worker';
UPDATE buyers SET manual_send = true,  worker_send = true  WHERE dispatch_mode = 'both';

ALTER TABLE buyers DROP COLUMN dispatch_mode;

-- ============================================================
-- 2. Counties: buyer routing filters (same pattern as sources)
-- ============================================================

ALTER TABLE counties
    ADD COLUMN buyer_filter_mode VARCHAR(10) DEFAULT NULL
        CHECK (buyer_filter_mode IN ('include', 'exclude')),
    ADD COLUMN buyer_filter_buyer_ids UUID[] NOT NULL DEFAULT '{}';
