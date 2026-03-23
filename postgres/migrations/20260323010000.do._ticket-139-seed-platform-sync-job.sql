-- TICKET-139: Seed platformSync job (guarded with NOT EXISTS).
-- interval_minutes = 1440 (24h). last_run seeded so first run fires at 11:00 UTC (6 AM EST).

INSERT INTO jobs (name, description, interval_minutes, last_run)
SELECT
    'platformSync',
    'Daily reconciliation matching — resolves pending platform_lead_records to Automator leads',
    1440,
    date_trunc('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '13 hours'
WHERE NOT EXISTS (
    SELECT 1 FROM jobs WHERE name = 'platformSync' AND deleted IS NULL
);
