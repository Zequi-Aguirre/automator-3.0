CREATE TABLE vendor_receives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- enforce array of valid us_state enum values
ALTER TABLE worker_settings
    ALTER COLUMN states_on_hold TYPE us_state[] USING (
        CASE
            WHEN jsonb_typeof(states_on_hold) = 'array'
            THEN (SELECT ARRAY(
                SELECT jsonb_array_elements_text(states_on_hold)::us_state
            ))
            ELSE ARRAY[]::us_state[]
        END
    );