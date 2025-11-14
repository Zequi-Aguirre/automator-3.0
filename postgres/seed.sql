-- INSERT USERS
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES
    ('123e4567-e89b-12d3-b456-226600000101', 'zequi4real@gmail.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Zequi', 'superadmin'),
    ('123e4567-e89b-12d3-b456-226600000102', 'admin@admin.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Admin', 'admin'),
    ('123e4567-e89b-12d3-b456-226600000103', 'user@user.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'User', 'user'),
    ('123e4567-e89b-12d3-b456-226600000104', 'worker@worker.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Worker', 'worker')
ON CONFLICT (id) DO NOTHING;

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
    max_delay
)
VALUES (
    '123e4567-e89b-12d3-b456-226600000501',
    'Default Worker Settings',
    '00:01',
    '23:59',
    4,
    11,
    3,
    36,        -- updated default for county cooldown
    '[]',      -- states_on_hold
    16,        -- investor cooldown in days
    2,
    4
)
ON CONFLICT (id) DO NOTHING;