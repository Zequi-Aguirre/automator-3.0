-- INSERT USERS
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES
    ('123e4567-e89b-12d3-b456-226600000101', 'zequi4real@gmail.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Zequi', 'superadmin'),
    ('123e4567-e89b-12d3-b456-226600000102', 'admin@admin.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Admin', 'admin'),
    ('123e4567-e89b-12d3-b456-226600000103', 'user@user.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'User', 'user'),
    ('123e4567-e89b-12d3-b456-226600000104', 'worker@worker.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Worker', 'worker')
ON CONFLICT (id) DO NOTHING;

UPDATE public."worker_settings"
SET
    name = 'Default Worker Settings',
    business_hours_start = '360',
    business_hours_end = '1380',
    minutes_range_start = 4,
    minutes_range_end = 11,
    delay_same_state = 3,
    delay_same_county = 36,      -- updated default for county cooldown
    states_on_hold = '{}',       -- states_on_hold
    delay_same_investor = 16,    -- investor cooldown in days
    min_delay = 2,
    max_delay = 4,
    cron_schedule = '* * * * *'
WHERE id = '123e4567-e89b-12d3-b456-226600000501';