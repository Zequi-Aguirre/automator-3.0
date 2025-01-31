CREATE TABLE public."worker_settings" (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    send_next_lead_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    last_worker_run TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    minutes_range_start INTEGER DEFAULT NULL,
    minutes_range_end INTEGER DEFAULT NULL,
    business_hours_start VARCHAR(5) NOT NULL,
    business_hours_end VARCHAR(5) NOT NULL,
    delay_same_state INTEGER DEFAULT NULL,
    getting_leads BOOLEAN NOT NULL DEFAULT FALSE,
    pause_app BOOLEAN NOT NULL DEFAULT TRUE,
    counties_on_hold JSONB DEFAULT '[]',
    states_on_hold JSONB DEFAULT '[]',
    created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT settings_pkey PRIMARY KEY (id)
);