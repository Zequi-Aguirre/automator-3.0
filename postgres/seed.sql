-- INSERT USERS
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES
    ('123e4567-e89b-12d3-b456-226600000101', 'zequi4real@gmail.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Zequi', 'superadmin'),
    ('123e4567-e89b-12d3-b456-226600000102', 'admin@admin.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Admin', 'admin'),
    ('123e4567-e89b-12d3-b456-226600000103', 'user@user.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'User', 'user'),
    ('123e4567-e89b-12d3-b456-226600000104', 'worker@worker.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Worker', 'worker')
ON CONFLICT (id) DO NOTHING;

-- INSERT LEADS
INSERT INTO public."leads" (id, address, city, state, zipcode, first_name, last_name, phone, email, county_id, county, imported_at)
VALUES
    ('123e4567-e89b-12d3-b456-226600000301', '1 Park Ave', 'New York', 'NY', '10016', 'John', 'Doe', '+1555000001', 'lead1@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York', now()),
    ('123e4567-e89b-12d3-b456-226600000302', '2 Broadway', 'New York', 'NY', '10004', 'Jane', 'Smith', '+1555000002', 'lead2@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York', now() - interval '3 hours'),
    ('123e4567-e89b-12d3-b456-226600000303', '3 Fifth Ave', 'New York', 'NY', '10010', 'James', 'Brown', '+1555000003', 'lead3@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York', now() - interval '10 hours'),
    ('123e4567-e89b-12d3-b456-226600000304', '4 Lexington Ave', 'New York', 'NY', '10022', 'Emily', 'Davis', '+1555000004', 'lead4@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York', now() - interval '17 hours'),
    ('123e4567-e89b-12d3-b456-226600000305', '5 Madison Ave', 'New York', 'NY', '10010', 'Robert', 'Johnson', '+1555000005', 'lead5@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- INSERT CAMPAIGNS (added buyer_id, using the admin user as the buyer)
INSERT INTO public."campaigns" (id, external_id, name, is_active)
VALUES
    ('123e4567-e89b-12d3-b456-226600000401', '123e4567-e89b-12d3-b456-226600000401', 'Campaign A', true),
    ('123e4567-e89b-12d3-b456-226600000402', '123e4567-e89b-12d3-b456-226600000402', 'Campaign B', true),
    ('123e4567-e89b-12d3-b456-226600000403', '123e4567-e89b-12d3-b456-226600000403', 'Campaign C', true),
    ('123e4567-e89b-12d3-b456-226600000404', '123e4567-e89b-12d3-b456-226600000404', 'Campaign D', true),
    ('123e4567-e89b-12d3-b456-226600000405', '123e4567-e89b-12d3-b456-226600000405', 'Campaign E', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."worker_settings" ( id, name, business_hours_start, business_hours_end, minutes_range_start, minutes_range_end, delay_same_state, delay_same_county, counties_on_hold, states_on_hold, min_delay, max_delay)
VALUES
    ('123e4567-e89b-12d3-b456-226600000501', 'Default Worker Settings', '00:01', '23:59', 4, 11, 3, 31, '[]', '[]', '2', '4')
ON CONFLICT (id) DO NOTHING;