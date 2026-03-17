-- TICKET-123: add resolves_call column to call_outcomes
-- When resolves_call = TRUE, logging this outcome closes the needs_call ticket

ALTER TABLE call_outcomes ADD COLUMN IF NOT EXISTS resolves_call BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed: "Resolved" outcome resolves the call
UPDATE call_outcomes SET resolves_call = TRUE WHERE label = 'Resolved';
