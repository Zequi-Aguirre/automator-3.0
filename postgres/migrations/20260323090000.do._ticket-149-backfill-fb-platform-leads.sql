-- TICKET-149: Backfill Automator leads from FB + Platform cross-reference
-- For each unmatched facebook_lead_record that has a phone match in platform_lead_records,
-- create an Automator lead using the Facebook form data and fb_created_time as the lead date.
-- Then link both facebook_lead_records and platform_lead_records to the new lead.
-- Uses EXECUTE to handle envs where worker_enabled column may or may not exist.

DO $$
DECLARE
    rec            RECORD;
    new_lead_id    UUID;
    first_nm       TEXT;
    last_nm        TEXT;
    full_nm        TEXT;
    created_count  INTEGER := 0;
    skipped_count  INTEGER := 0;
    has_worker_col BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'worker_enabled'
    ) INTO has_worker_col;

    FOR rec IN
        SELECT DISTINCT ON (flr.phone_normalized)
            flr.id                  AS fb_record_id,
            flr.fb_lead_id,
            flr.phone,
            flr.phone_normalized,
            flr.email,
            flr.source_id,
            flr.automator_campaign_id,
            flr.fb_created_time,
            flr.field_data,
            flr.fb_ad_id,
            flr.fb_ad_name
        FROM facebook_lead_records flr
        WHERE flr.match_status = 'unmatched'
          AND flr.phone_normalized IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM platform_lead_records plr
              WHERE plr.phone_normalized = flr.phone_normalized
          )
        ORDER BY flr.phone_normalized, flr.fb_created_time ASC NULLS LAST
    LOOP
        first_nm    := NULL;
        last_nm     := NULL;
        full_nm     := NULL;
        new_lead_id := NULL;

        SELECT trim(both '"' FROM (elem -> 'values' -> 0)::text)
        INTO first_nm
        FROM jsonb_array_elements(rec.field_data) AS elem
        WHERE elem ->> 'name' ILIKE '%first%'
        LIMIT 1;

        SELECT trim(both '"' FROM (elem -> 'values' -> 0)::text)
        INTO last_nm
        FROM jsonb_array_elements(rec.field_data) AS elem
        WHERE elem ->> 'name' ILIKE '%last%'
        LIMIT 1;

        IF first_nm IS NULL THEN
            SELECT trim(both '"' FROM (elem -> 'values' -> 0)::text)
            INTO full_nm
            FROM jsonb_array_elements(rec.field_data) AS elem
            WHERE elem ->> 'name' ILIKE '%name%'
              AND elem ->> 'name' NOT ILIKE '%first%'
              AND elem ->> 'name' NOT ILIKE '%last%'
            LIMIT 1;

            IF full_nm IS NOT NULL AND position(' ' IN full_nm) > 0 THEN
                first_nm := split_part(full_nm, ' ', 1);
                last_nm  := substring(full_nm FROM position(' ' IN full_nm) + 1);
            ELSE
                first_nm := COALESCE(full_nm, '');
                last_nm  := '';
            END IF;
        END IF;

        IF has_worker_col THEN
            EXECUTE $q$
                INSERT INTO leads (
                    first_name, last_name, phone, email,
                    address, city, state, zipcode,
                    source_id, campaign_id,
                    external_lead_id, external_ad_id, external_ad_name,
                    created, verified, worker_enabled
                ) VALUES ($1,$2,$3,$4,'','','','',$5,$6,$7,$8,$9,$10,false,false)
                ON CONFLICT (phone) DO NOTHING
                RETURNING id
            $q$
            INTO new_lead_id
            USING COALESCE(first_nm,''), COALESCE(last_nm,''),
                  rec.phone, rec.email,
                  rec.source_id, rec.automator_campaign_id,
                  rec.fb_lead_id, rec.fb_ad_id, rec.fb_ad_name,
                  COALESCE(rec.fb_created_time, NOW());
        ELSE
            EXECUTE $q$
                INSERT INTO leads (
                    first_name, last_name, phone, email,
                    address, city, state, zipcode,
                    source_id, campaign_id,
                    external_lead_id, external_ad_id, external_ad_name,
                    created, verified
                ) VALUES ($1,$2,$3,$4,'','','','',$5,$6,$7,$8,$9,$10,false)
                ON CONFLICT (phone) DO NOTHING
                RETURNING id
            $q$
            INTO new_lead_id
            USING COALESCE(first_nm,''), COALESCE(last_nm,''),
                  rec.phone, rec.email,
                  rec.source_id, rec.automator_campaign_id,
                  rec.fb_lead_id, rec.fb_ad_id, rec.fb_ad_name,
                  COALESCE(rec.fb_created_time, NOW());
        END IF;

        IF new_lead_id IS NOT NULL THEN
            created_count := created_count + 1;

            UPDATE facebook_lead_records
            SET automator_lead_id = new_lead_id,
                match_status      = 'matched'
            WHERE id = rec.fb_record_id;

            UPDATE platform_lead_records
            SET automator_lead_id = new_lead_id,
                match_status      = 'matched'
            WHERE phone_normalized = rec.phone_normalized
              AND match_status    != 'matched';
        ELSE
            skipped_count := skipped_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'TICKET-149 backfill complete: % leads created, % skipped (phone already existed)', created_count, skipped_count;
END $$;
