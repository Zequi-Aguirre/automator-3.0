CREATE TABLE call_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 50,
    created TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX call_outcomes_label_key ON call_outcomes (label);

INSERT INTO call_outcomes (label, sort_order) VALUES
    ('Resolved',          10),
    ('No answer',         20),
    ('Left voicemail',    30),
    ('Wrong number',      40),
    ('Scheduled callback',50),
    ('Not interested',    60),
    ('Other',             70);
