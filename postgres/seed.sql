-- INSERT USERS
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES
    ('123e4567-e89b-12d3-b456-226600000101', 'zequi4real@gmail.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Zequi', 'superadmin'),
    ('123e4567-e89b-12d3-b456-226600000102', 'admin@admin.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Admin', 'admin'),
    ('123e4567-e89b-12d3-b456-226600000103', 'user@user.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'User', 'user'),
    ('123e4567-e89b-12d3-b456-226600000104', 'worker@worker.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Worker', 'worker')
ON CONFLICT (id) DO NOTHING;

-- INSERT worker_settings initial row
-- Note: Cooldown/timing fields moved to buyers table in Sprint 3
INSERT INTO public."worker_settings" (
    id,
    name,
    business_hours_start,
    business_hours_end,
    cron_schedule,
    expire_after_hours,
    enforce_expiration,
    worker_enabled
)
VALUES (
    '123e4567-e89b-12d3-b456-226600000501',
    'Default Worker Settings',
    360,  -- 6:00 AM
    1380, -- 11:00 PM
    '* * * * *', -- Every minute
    18,   -- Expire after 18 hours
    true, -- Enforce expiration
    false -- Worker disabled by default
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    business_hours_start = EXCLUDED.business_hours_start,
    business_hours_end = EXCLUDED.business_hours_end,
    cron_schedule = EXCLUDED.cron_schedule,
    expire_after_hours = EXCLUDED.expire_after_hours,
    enforce_expiration = EXCLUDED.enforce_expiration,
    worker_enabled = EXCLUDED.worker_enabled;