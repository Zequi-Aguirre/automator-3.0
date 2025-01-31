-- INSERT USERS
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES
    ('123e4567-e89b-12d3-b456-226600000101', 'zequi4real@gmail.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Zequi', 'superadmin'),
    ('123e4567-e89b-12d3-b456-226600000102', 'admin@admin.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Admin', 'admin'),
    ('123e4567-e89b-12d3-b456-226600000103', 'user@user.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'User', 'user'),
    ('123e4567-e89b-12d3-b456-226600000104', 'worker@worker.com', '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG', 'Worker', 'worker')
ON CONFLICT (id) DO NOTHING;

-- INSERT LEADS
INSERT INTO public."leads" (id, address, city, state, zipcode, first_name, last_name, phone, is_test, email, county_id, county)
VALUES
    ('123e4567-e89b-12d3-b456-226600000301', '1 Park Ave', 'New York', 'NY', '10016', 'John', 'Doe', '+1555000001', true, 'lead1@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000302', '2 Broadway', 'New York', 'NY', '10004', 'Jane', 'Smith', '+1555000002', true, 'lead2@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000303', '3 Fifth Ave', 'New York', 'NY', '10010', 'James', 'Brown', '+1555000003', true, 'lead3@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000304', '4 Lexington Ave', 'New York', 'NY', '10022', 'Emily', 'Davis', '+1555000004', true, 'lead4@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000305', '5 Madison Ave', 'New York', 'NY', '10010', 'Robert', 'Johnson', '+1555000005', true, 'lead5@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000306', '6 Wall Street', 'New York', 'NY', '10005', 'Michael', 'Lee', '+1555000006', true, 'lead6@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000307', '7 Times Square', 'New York', 'NY', '10036', 'Elizabeth', 'Taylor', '+1555000007', true, 'lead7@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000308', '8 Columbus Circle', 'New York', 'NY', '10019', 'David', 'Moore', '+1555000008', true, 'lead8@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000309', '9 Hudson St', 'New York', 'NY', '10013', 'Sarah', 'White', '+1555000009', true, 'lead9@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000310', '10 Broadway', 'New York', 'NY', '10004', 'William', 'Clark', '+1555000010', true, 'lead10@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000311', '11 Avenue of the Americas', 'New York', 'NY', '10036', 'Sophia', 'Hall', '+1555000011', true, 'lead11@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000312', '12 Battery Park', 'New York', 'NY', '10004', 'Daniel', 'Allen', '+1555000012', true, 'lead12@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000313', '13 East 42nd St', 'New York', 'NY', '10017', 'Grace', 'Young', '+1555000013', true, 'lead13@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000314', '14 West End Ave', 'New York', 'NY', '10023', 'Andrew', 'King', '+1555000014', true, 'lead14@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000315', '15 Greenwich St', 'New York', 'NY', '10006', 'Amelia', 'Wright', '+1555000015', true, 'lead15@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000316', '16 Astor Place', 'New York', 'NY', '10003', 'Thomas', 'Martin', '+1555000016', true, 'lead16@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000317', '17 Delancey St', 'New York', 'NY', '10002', 'Emma', 'Harris', '+1555000017', true, 'lead17@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000318', '18 Cooper Square', 'New York', 'NY', '10003', 'Henry', 'Robinson', '+1555000018', true, 'lead18@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000319', '19 Water St', 'New York', 'NY', '10004', 'Victoria', 'Walker', '+1555000019', true, 'lead19@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000320', '20 Murray St', 'New York', 'NY', '10007', 'Edward', 'Perez', '+1555000020', true, 'lead20@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000321', '21 Pearl St', 'New York', 'NY', '10038', 'Lucas', 'Green', '+1555000021', true, 'lead21@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000322', '22 Canal St', 'New York', 'NY', '10013', 'Charlotte', 'Adams', '+1555000022', true, 'lead22@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000323', '23 Beekman St', 'New York', 'NY', '10038', 'Oliver', 'Nelson', '+1555000023', true, 'lead23@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000324', '24 Vesey St', 'New York', 'NY', '10007', 'Sophia', 'Carter', '+1555000024', true, 'lead24@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000325', '25 Maiden Lane', 'New York', 'NY', '10038', 'Noah', 'Mitchell', '+1555000025', true, 'lead25@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000326', '26 Centre St', 'New York', 'NY', '10007', 'Mia', 'Perez', '+1555000026', true, 'lead26@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000327', '27 Gold St', 'New York', 'NY', '10038', 'Ethan', 'Garcia', '+1555000027', true, 'lead27@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000328', '28 Spruce St', 'New York', 'NY', '10038', 'Harper', 'Martinez', '+1555000028', true, 'lead28@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000329', '29 Fulton St', 'New York', 'NY', '10038', 'Benjamin', 'Rodriguez', '+1555000029', true, 'lead29@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000330', '30 John St', 'New York', 'NY', '10038', 'Evelyn', 'Hernandez', '+1555000030', true, 'lead30@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000331', '31 William St', 'New York', 'NY', '10038', 'Jack', 'Lopez', '+1555000031', true, 'lead31@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000332', '32 Ann St', 'New York', 'NY', '10038', 'Ava', 'Gonzalez', '+1555000032', true, 'lead32@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000333', '33 Pine St', 'New York', 'NY', '10005', 'Jacob', 'Wilson', '+1555000033', true, 'lead33@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000334', '34 Cedar St', 'New York', 'NY', '10006', 'Ella', 'Anderson', '+1555000034', true, 'lead34@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000335', '35 Front St', 'New York', 'NY', '10038', 'Matthew', 'Thomas', '+1555000035', true, 'lead35@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000336', '36 Water St', 'New York', 'NY', '10004', 'Emily', 'Taylor', '+1555000036', true, 'lead36@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000337', '37 Nassau St', 'New York', 'NY', '10038', 'Alexander', 'White', '+1555000037', true, 'lead37@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000338', '38 Pearl St', 'New York', 'NY', '10004', 'Lily', 'Harris', '+1555000038', true, 'lead38@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000339', '39 Hanover Square', 'New York', 'NY', '10004', 'Logan', 'Martin', '+1555000039', true, 'lead39@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000340', '40 Front St', 'New York', 'NY', '10038', 'Madison', 'Clark', '+1555000040', true, 'lead40@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000341', '41 Cliff St', 'New York', 'NY', '10038', 'Samuel', 'Lewis', '+1555000041', true, 'lead41@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000342', '42 Wall St', 'New York', 'NY', '10005', 'Scarlett', 'Lee', '+1555000042', true, 'lead42@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000343', '43 Park Row', 'New York', 'NY', '10038', 'Gabriel', 'Walker', '+1555000043', true, 'lead43@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000344', '44 Whitehall St', 'New York', 'NY', '10004', 'Hannah', 'Young', '+1555000044', true, 'lead44@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000345', '45 Rector St', 'New York', 'NY', '10006', 'Anthony', 'King', '+1555000045', true, 'lead45@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000346', '46 Beaver St', 'New York', 'NY', '10004', 'Zoe', 'Wright', '+1555000046', true, 'lead46@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000347', '47 Pearl St', 'New York', 'NY', '10004', 'Isaac', 'Hill', '+1555000047', true, 'lead47@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000348', '48 State St', 'New York', 'NY', '10004', 'Layla', 'Scott', '+1555000048', true, 'lead48@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000349', '49 Bridge St', 'New York', 'NY', '10004', 'Aaron', 'Torres', '+1555000049', true, 'lead49@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York'),
    ('123e4567-e89b-12d3-b456-226600000350', '50 Stone St', 'New York', 'NY', '10004', 'Aubrey', 'Reed', '+1555000050', true, 'lead50@example.com', '123e4567-e89a-12d3-b456-226600001110', 'New York')
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

INSERT INTO public."worker_settings" ( id, name, business_hours_start, business_hours_end, minutes_range_start, minutes_range_end, delay_same_state, delay_same_county, getting_leads, pause_app, counties_on_hold, states_on_hold, min_delay, max_delay)
VALUES
    ('123e4567-e89b-12d3-b456-226600000501', 'Default Worker Settings', '00:01', '23:59', 4, 11, 3, 31, false, true, '[]', '[]', '2', '4')
ON CONFLICT (id) DO NOTHING;