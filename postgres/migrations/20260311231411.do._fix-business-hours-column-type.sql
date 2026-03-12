-- Change business_hours_start and business_hours_end from VARCHAR(5) to INTEGER (minutes since midnight).
-- Handles two possible formats already in the DB:
--   '430'   -> numeric string saved by the UI after the user updates settings (e.g. 7h10m = 430 min)
--   '07:10' -> original HH:MM format from the seed migration
ALTER TABLE worker_settings
    ALTER COLUMN business_hours_start TYPE INTEGER
        USING CASE
            WHEN business_hours_start ~ '^\d+$'
                THEN business_hours_start::INTEGER
            WHEN business_hours_start ~ '^\d{1,2}:\d{2}$'
                THEN split_part(business_hours_start, ':', 1)::INTEGER * 60
                   + split_part(business_hours_start, ':', 2)::INTEGER
            ELSE 0
        END,
    ALTER COLUMN business_hours_end TYPE INTEGER
        USING CASE
            WHEN business_hours_end ~ '^\d+$'
                THEN business_hours_end::INTEGER
            WHEN business_hours_end ~ '^\d{1,2}:\d{2}$'
                THEN split_part(business_hours_end, ':', 1)::INTEGER * 60
                   + split_part(business_hours_end, ':', 2)::INTEGER
            ELSE 1439
        END;
