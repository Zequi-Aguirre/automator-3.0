-- Migration: Create initial buyers (Compass, Sellers, iSpeedToLead) and make send_log.buyer_id NOT NULL
-- Description: Creates three buyer records with webhooks, backfills all existing send_log entries to iSpeedToLead,
--              and enforces NOT NULL constraint on buyer_id for zero-downtime migration

-- ========================================
-- UP Migration
-- ========================================

DO $$
DECLARE
    compass_buyer_id UUID;
    sellers_buyer_id UUID;
    ispeed_buyer_id UUID;
BEGIN
    -- Create Compass buyer (Priority 1 - Highest)
    INSERT INTO buyers (
        id,
        name,
        webhook_url,
        dispatch_mode,
        priority,
        auto_send,
        allow_resell,
        requires_validation,
        min_minutes_between_sends,
        max_minutes_between_sends,
        auth_header_name,
        auth_header_prefix,
        auth_token_encrypted
    ) VALUES (
        gen_random_uuid(),
        'Compass',
        'https://hook.us2.make.com/nqghehzuue7f59zu5bf0gaoynel9javf?buyer=Compass',
        'manual',  -- Manual sends only (high-value buyer)
        1,  -- Priority 1 (highest)
        false,  -- No auto-send (manual only)
        false,  -- Don't allow resell (exclusive)
        false,  -- No validation required
        4,
        11,
        'Authorization',
        NULL,
        NULL
    )
    RETURNING id INTO compass_buyer_id;

    RAISE NOTICE 'Created Compass buyer with ID: %', compass_buyer_id;

    -- Create Sellers buyer (Priority 2)
    INSERT INTO buyers (
        id,
        name,
        webhook_url,
        dispatch_mode,
        priority,
        auto_send,
        allow_resell,
        requires_validation,
        min_minutes_between_sends,
        max_minutes_between_sends,
        auth_header_name,
        auth_header_prefix,
        auth_token_encrypted
    ) VALUES (
        gen_random_uuid(),
        'Sellers',
        'https://hook.us2.make.com/nqghehzuue7f59zu5bf0gaoynel9javf?buyer=Sellers',
        'manual',  -- Manual sends only
        2,  -- Priority 2
        false,  -- No auto-send (manual only)
        false,  -- Don't allow resell (exclusive)
        false,  -- No validation required
        4,
        11,
        'Authorization',
        NULL,
        NULL
    )
    RETURNING id INTO sellers_buyer_id;

    RAISE NOTICE 'Created Sellers buyer with ID: %', sellers_buyer_id;

    -- Create iSpeedToLead buyer (Priority 6 - Fallback/Lowest)
    INSERT INTO buyers (
        id,
        name,
        webhook_url,
        dispatch_mode,
        priority,
        auto_send,
        allow_resell,
        requires_validation,
        min_minutes_between_sends,
        max_minutes_between_sends,
        auth_header_name,
        auth_header_prefix,
        auth_token_encrypted
    ) VALUES (
        gen_random_uuid(),
        'iSpeedToLead',
        'https://hook.us2.make.com/nqghehzuue7f59zu5bf0gaoynel9javf?buyer=iSpeedToLead',
        'worker',  -- Worker automation only
        6,  -- Priority 6 (fallback/lowest priority)
        true,  -- Auto-send enabled (worker automation)
        true,  -- Allow resell (can receive leads sold to others)
        true,  -- Requires validation
        4,
        11,
        'Authorization',
        NULL,
        NULL
    )
    RETURNING id INTO ispeed_buyer_id;

    RAISE NOTICE 'Created iSpeedToLead buyer with ID: %', ispeed_buyer_id;

    -- Backfill all existing send_log entries with iSpeedToLead buyer_id
    -- All historical sends are to iSpeedToLead (the only vendor in use)
    UPDATE send_log
    SET buyer_id = ispeed_buyer_id
    WHERE buyer_id IS NULL;

    RAISE NOTICE 'Backfilled % send_log entries', (SELECT COUNT(*) FROM send_log WHERE buyer_id = ispeed_buyer_id);

    -- Now make buyer_id NOT NULL (all rows have been backfilled)
    ALTER TABLE send_log
    ALTER COLUMN buyer_id SET NOT NULL;

    RAISE NOTICE 'Set send_log.buyer_id to NOT NULL';

END $$;

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
-- ALTER TABLE send_log ALTER COLUMN buyer_id DROP NOT NULL;
-- UPDATE send_log SET buyer_id = NULL WHERE buyer_id IN (SELECT id FROM buyers WHERE name IN ('Compass', 'Sellers', 'iSpeedToLead'));
-- DELETE FROM buyers WHERE name IN ('Compass', 'Sellers', 'iSpeedToLead');
