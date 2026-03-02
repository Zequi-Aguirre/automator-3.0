-- Undo Migration: Restore Broward and Miami-Dade counties
-- Ticket: TICKET-047
-- Date: 2026-03-02

-- Re-insert Broward County (as it was before)
INSERT INTO counties (name, state, population, timezone, blacklisted)
VALUES ('Broward', 'FL', 1944375, 'America/New_York', true)
ON CONFLICT DO NOTHING;

-- Re-insert Miami-Dade County (as it was before)
INSERT INTO counties (name, state, population, timezone, blacklisted)
VALUES ('Miami-Dade', 'FL', 2716940, 'America/New_York', true)
ON CONFLICT DO NOTHING;
