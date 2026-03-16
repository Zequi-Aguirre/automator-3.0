-- INSERT USERS
-- Only the owner/superadmin. All other users must request access via the application.
-- The system@automator service account is created via migration 20260317030000.
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES
    ('123e4567-e89b-12d3-b456-226600000101', 'zequi4real@gmail.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Zequi', 'superadmin')
ON CONFLICT (id) DO NOTHING;

-- INSERT worker_settings initial row
INSERT INTO public."worker_settings" (
    id,
    name,
    business_hours_start,
    business_hours_end,
    cron_schedule,
    expire_after_hours,
    enforce_expiration,
    worker_enabled,
    auto_queue_on_verify
)
VALUES (
    '123e4567-e89b-12d3-b456-226600000501',
    'Default Worker Settings',
    360,  -- 6:00 AM
    1380, -- 11:00 PM
    '* * * * *', -- Every minute
    60,   -- Expire after 60 hours
    true, -- Enforce expiration
    false,-- Worker disabled by default
    true  -- Auto-queue leads on verification
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    business_hours_start = EXCLUDED.business_hours_start,
    business_hours_end = EXCLUDED.business_hours_end,
    cron_schedule = EXCLUDED.cron_schedule,
    expire_after_hours = EXCLUDED.expire_after_hours,
    enforce_expiration = EXCLUDED.enforce_expiration,
    worker_enabled = EXCLUDED.worker_enabled,
    auto_queue_on_verify = EXCLUDED.auto_queue_on_verify;