-- Migration: Backfill iSpeedToLead buyer and make send_log.buyer_id NOT NULL
-- Description: Creates iSpeedToLead buyer record, backfills all existing send_log entries,
--              and enforces NOT NULL constraint on buyer_id for zero-downtime migration

-- ========================================
-- UP Migration
-- ========================================

DO $$
DECLARE
    ispeed_buyer_id UUID;
BEGIN
    -- Create iSpeedToLead buyer record
    -- This is the only buyer in the system currently (all existing sends are to iSpeedToLead)
    -- NOTE: Replace 'PLACEHOLDER_ISPEEDTOLEAD_WEBHOOK_URL' with actual webhook URL
    -- OR update through admin UI after migration runs
    -- The URL is currently stored in LEAD_VENDOR_URL environment variable
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
        'PLACEHOLDER_ISPEEDTOLEAD_WEBHOOK_URL',  -- UPDATE THIS BEFORE RUNNING MIGRATION
        'worker',
        6,  -- Priority 6 (fallback/lowest priority)
        true,
        true,
        true,
        4,
        11,
        'Authorization',
        NULL,
        NULL  -- Will be set later through UI if needed
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
-- UPDATE send_log SET buyer_id = NULL WHERE buyer_id IN (SELECT id FROM buyers WHERE name = 'iSpeedToLead');
-- DELETE FROM buyers WHERE name = 'iSpeedToLead';
