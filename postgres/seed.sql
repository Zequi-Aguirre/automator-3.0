-- INSERT USERS
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES
    ('123e4567-e89b-12d3-b456-226600000101', 'zequi4real@gmail.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Zequi', 'superadmin'),
    ('123e4567-e89b-12d3-b456-226600000102', 'admin@admin.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Admin', 'admin'),
    ('123e4567-e89b-12d3-b456-226600000103', 'user@user.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'User', 'user'),
    ('123e4567-e89b-12d3-b456-226600000104', 'worker@worker.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Worker', 'worker')
ON CONFLICT (id) DO NOTHING;

-- INSERT worker_settings initial row
INSERT INTO public."worker_settings" (
    id,
    name,
    business_hours_start,
    business_hours_end,
    minutes_range_start,
    minutes_range_end,
    delay_same_state,
    delay_same_county,
    states_on_hold,
    delay_same_investor,
    min_delay,
    max_delay,
    cron_schedule,
    expire_after_hours,
    worker_enabled
)
VALUES (
    '123e4567-e89b-12d3-b456-226600000501',
    'Default Worker Settings',
    '360',
    '1380',
    4,
    11,
    3,
    36,
    '{}',
    48,
    2,
    4,
    '* * * * *',
    18,
    false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    business_hours_start = EXCLUDED.business_hours_start,
    business_hours_end = EXCLUDED.business_hours_end,
    minutes_range_start = EXCLUDED.minutes_range_start,
    minutes_range_end = EXCLUDED.minutes_range_end,
    delay_same_state = EXCLUDED.delay_same_state,
    delay_same_county = EXCLUDED.delay_same_county,
    states_on_hold = EXCLUDED.states_on_hold,
    delay_same_investor = EXCLUDED.delay_same_investor,
    min_delay = EXCLUDED.min_delay,
    max_delay = EXCLUDED.max_delay,
    cron_schedule = EXCLUDED.cron_schedule,
    expire_after_hours = EXCLUDED.expire_after_hours,
    worker_enabled = EXCLUDED.worker_enabled;