CREATE TABLE vendor_receives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE worker_settings
ADD COLUMN states_on_hold_text text[];

UPDATE worker_settings
SET states_on_hold_text = CASE
    WHEN jsonb_typeof(states_on_hold) = 'array'
        THEN array(SELECT jsonb_array_elements_text(states_on_hold))
    ELSE ARRAY[]::text[]
END;

ALTER TABLE worker_settings
DROP COLUMN states_on_hold;

ALTER TABLE worker_settings
RENAME COLUMN states_on_hold_text TO states_on_hold;