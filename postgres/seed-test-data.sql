-- ============================================================
-- TEST DATA SEED
-- Run with: podman cp postgres/seed-test-data.sql automator-dev:/tmp/ && podman exec automator-dev psql -U automator -d automator -f /tmp/seed-test-data.sql
-- Safe to re-run (ON CONFLICT DO NOTHING / DO UPDATE)
-- ============================================================

-- Lead Managers
INSERT INTO lead_managers (id, name) VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', 'Sarah Mitchell'),
  ('aaaaaaaa-0001-0000-0000-000000000002', 'James Rodriguez')
ON CONFLICT DO NOTHING;

-- Sources
INSERT INTO sources (id, name, token, lead_manager_id) VALUES
  ('bbbbbbbb-0002-0000-0000-000000000001', 'Facebook Ads',  'tok_fb_001', 'aaaaaaaa-0001-0000-0000-000000000001'),
  ('bbbbbbbb-0002-0000-0000-000000000002', 'Direct Mail',   'tok_dm_002', 'aaaaaaaa-0001-0000-0000-000000000002'),
  ('bbbbbbbb-0002-0000-0000-000000000003', 'Cold Outreach', 'tok_co_003', NULL)
ON CONFLICT DO NOTHING;

-- Counties
INSERT INTO counties (id, name, state, timezone) VALUES
  ('cccccccc-0003-0000-0000-000000000001', 'Cook',        'IL', 'America/Chicago'),
  ('cccccccc-0003-0000-0000-000000000002', 'DuPage',      'IL', 'America/Chicago'),
  ('cccccccc-0003-0000-0000-000000000003', 'Lake',        'IL', 'America/Chicago'),
  ('cccccccc-0003-0000-0000-000000000004', 'Harris',      'TX', 'America/Chicago'),
  ('cccccccc-0003-0000-0000-000000000005', 'Los Angeles', 'CA', 'America/Los_Angeles')
ON CONFLICT DO NOTHING;

-- Campaigns
INSERT INTO campaigns (id, name, source_id, platform, external_campaign_id, external_campaign_name) VALUES
  ('dddddddd-0004-0000-0000-000000000001', 'Summer 2025 - IL', 'bbbbbbbb-0002-0000-0000-000000000001', 'facebook',    'fb_camp_001', 'Summer 2025 IL Homeowners'),
  ('dddddddd-0004-0000-0000-000000000002', 'Q1 Mail Blast',    'bbbbbbbb-0002-0000-0000-000000000002', 'direct_mail', NULL,          NULL),
  ('dddddddd-0004-0000-0000-000000000003', 'TX Outreach',      'bbbbbbbb-0002-0000-0000-000000000003', 'cold_call',   NULL,          NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- LEADS — all statuses
-- ============================================================
INSERT INTO leads (id, first_name, last_name, phone, email, address, city, state, zipcode, county, county_id, source_id, campaign_id, verified, created) VALUES

  -- NEW (unverified, no flags)
  ('eeeeeeee-0005-0000-0000-000000000001', 'Alice',  'Nguyen',   '3125550101', 'alice@example.com',  '142 Oak St',      'Chicago',     'IL', '60601', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', false, NOW() - INTERVAL '2 days'),
  ('eeeeeeee-0005-0000-0000-000000000002', 'Bob',    'Patel',    '3125550102', 'bob@example.com',    '75 Maple Ave',    'Naperville',  'IL', '60540', 'DuPage',      'cccccccc-0003-0000-0000-000000000002', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', false, NOW() - INTERVAL '5 hours'),
  ('eeeeeeee-0005-0000-0000-000000000003', 'Carol',  'Kim',      '8475550103', 'carol@example.com',  '309 Pine Rd',     'Waukegan',    'IL', '60085', 'Lake',        'cccccccc-0003-0000-0000-000000000003', 'bbbbbbbb-0002-0000-0000-000000000002', 'dddddddd-0004-0000-0000-000000000002', false, NOW() - INTERVAL '30 minutes'),

  -- VERIFIED (not queued)
  ('eeeeeeee-0005-0000-0000-000000000010', 'David',  'Chen',     '3125550110', 'david@example.com',  '88 Elm Blvd',     'Chicago',     'IL', '60614', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', true,  NOW() - INTERVAL '3 days'),
  ('eeeeeeee-0005-0000-0000-000000000011', 'Eva',    'Torres',   '3125550111', 'eva@example.com',    '14 Birch Ln',     'Evanston',    'IL', '60201', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000002', 'dddddddd-0004-0000-0000-000000000002', true,  NOW() - INTERVAL '1 day'),

  -- VERIFIED + QUEUED (worker)
  ('eeeeeeee-0005-0000-0000-000000000020', 'Frank',  'Johnson',  '3125550120', 'frank@example.com',  '501 Walnut St',   'Chicago',     'IL', '60622', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', true,  NOW() - INTERVAL '6 hours'),
  ('eeeeeeee-0005-0000-0000-000000000021', 'Grace',  'Lee',      '7085550121', 'grace@example.com',  '230 Cedar Dr',    'Aurora',      'IL', '60506', 'DuPage',      'cccccccc-0003-0000-0000-000000000002', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', true,  NOW() - INTERVAL '2 hours'),

  -- NEEDS REVIEW
  ('eeeeeeee-0005-0000-0000-000000000030', 'Hank',   'Wilson',   '3125550130', 'hank@example.com',   '19 Spruce Way',   'Chicago',     'IL', '60608', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', false, NOW() - INTERVAL '1 day'),
  ('eeeeeeee-0005-0000-0000-000000000031', 'Irene',  'Martinez', '3125550131', 'irene@example.com',  '88 Willow Ct',    'Skokie',      'IL', '60076', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000002', 'dddddddd-0004-0000-0000-000000000002', false, NOW() - INTERVAL '4 hours'),

  -- NEEDS CALL — with note
  ('eeeeeeee-0005-0000-0000-000000000040', 'Jake',   'Brown',    '3125550140', 'jake@example.com',   '77 Ash St',       'Berwyn',      'IL', '60402', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', false, NOW() - INTERVAL '2 days'),
  -- NEEDS CALL — no note
  ('eeeeeeee-0005-0000-0000-000000000041', 'Karen',  'Davis',    '3125550141', 'karen@example.com',  '33 Poplar Ave',   'Oak Park',    'IL', '60301', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000002', 'dddddddd-0004-0000-0000-000000000002', false, NOW() - INTERVAL '1 day'),
  -- NEEDS CALL — 2 attempts already logged
  ('eeeeeeee-0005-0000-0000-000000000042', 'Leo',    'Garcia',   '8475550142', 'leo@example.com',    '55 Hickory Blvd', 'Waukegan',    'IL', '60085', 'Lake',        'cccccccc-0003-0000-0000-000000000003', 'bbbbbbbb-0002-0000-0000-000000000002', 'dddddddd-0004-0000-0000-000000000002', false, NOW() - INTERVAL '3 days'),

  -- SENT (manual, mixed results)
  ('eeeeeeee-0005-0000-0000-000000000050', 'Mia',    'Taylor',   '3125550150', 'mia@example.com',    '200 Chestnut St', 'Chicago',     'IL', '60611', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', true,  NOW() - INTERVAL '4 days'),
  -- SENT (worker)
  ('eeeeeeee-0005-0000-0000-000000000051', 'Noah',   'Anderson', '7135550151', 'noah@example.com',   '410 Sycamore Rd', 'Houston',     'TX', '77001', 'Harris',      'cccccccc-0003-0000-0000-000000000004', 'bbbbbbbb-0002-0000-0000-000000000003', 'dddddddd-0004-0000-0000-000000000003', true,  NOW() - INTERVAL '2 days'),
  -- SENT + DISPUTED
  ('eeeeeeee-0005-0000-0000-000000000052', 'Olivia', 'White',    '3125550152', 'olivia@example.com', '92 Magnolia Pl',  'Chicago',     'IL', '60647', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', true,  NOW() - INTERVAL '5 days'),

  -- SOLD
  ('eeeeeeee-0005-0000-0000-000000000060', 'Paul',   'Harris',   '3125550160', 'paul@example.com',   '1 Lakeshore Dr',  'Chicago',     'IL', '60601', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', true,  NOW() - INTERVAL '7 days'),
  ('eeeeeeee-0005-0000-0000-000000000061', 'Quinn',  'Clark',    '2135550161', 'quinn@example.com',  '88 Sunset Blvd',  'Los Angeles', 'CA', '90001', 'Los Angeles', 'cccccccc-0003-0000-0000-000000000005', 'bbbbbbbb-0002-0000-0000-000000000003', 'dddddddd-0004-0000-0000-000000000003', true,  NOW() - INTERVAL '10 days'),

  -- TRASHED
  ('eeeeeeee-0005-0000-0000-000000000070', 'Rachel', 'Lewis',    '3125550170', 'rachel@example.com', '45 Grove St',     'Chicago',     'IL', '60618', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', false, NOW() - INTERVAL '8 days'),
  ('eeeeeeee-0005-0000-0000-000000000071', 'Sam',    'Robinson', '3125550171', 'sam@example.com',    '999 Bramble Rd',  'Cicero',      'IL', '60804', 'Cook',        'cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0002-0000-0000-000000000002', 'dddddddd-0004-0000-0000-000000000002', true,  NOW() - INTERVAL '6 days')

ON CONFLICT DO NOTHING;

-- ============================================================
-- Patch special states
-- ============================================================

UPDATE leads SET queued = true
  WHERE id IN ('eeeeeeee-0005-0000-0000-000000000020','eeeeeeee-0005-0000-0000-000000000021');

UPDATE leads SET needs_review = true, needs_review_reason = 'Missing phone number — could not verify ownership'
  WHERE id = 'eeeeeeee-0005-0000-0000-000000000030';
UPDATE leads SET needs_review = true, needs_review_reason = 'Address does not match county records'
  WHERE id = 'eeeeeeee-0005-0000-0000-000000000031';

UPDATE leads SET
  needs_call = true, call_reason = 'Didn''t pick up',
  call_request_note = 'Called twice, goes straight to voicemail. Try after 6pm.',
  call_requested_at = NOW() - INTERVAL '1 day',
  call_requested_by = '123e4567-e89b-12d3-b456-226600000101'
  WHERE id = 'eeeeeeee-0005-0000-0000-000000000040';

UPDATE leads SET
  needs_call = true, call_reason = 'Follow-up needed',
  call_requested_at = NOW() - INTERVAL '12 hours',
  call_requested_by = '123e4567-e89b-12d3-b456-226600000102'
  WHERE id = 'eeeeeeee-0005-0000-0000-000000000041';

UPDATE leads SET
  needs_call = true, call_reason = 'Requested callback',
  call_request_note = 'Homeowner asked us to call back Saturday morning.',
  call_requested_at = NOW() - INTERVAL '2 days',
  call_requested_by = '123e4567-e89b-12d3-b456-226600000101',
  call_attempts = 2, call_executed_at = NOW() - INTERVAL '6 hours', call_outcome = 'no_answer'
  WHERE id = 'eeeeeeee-0005-0000-0000-000000000042';

UPDATE leads SET deleted = NOW() - INTERVAL '7 days', deleted_reason = 'Duplicate lead'
  WHERE id = 'eeeeeeee-0005-0000-0000-000000000070';
UPDATE leads SET deleted = NOW() - INTERVAL '5 days', deleted_reason = 'Not interested'
  WHERE id = 'eeeeeeee-0005-0000-0000-000000000071';

-- ============================================================
-- Lead Form Inputs (verified leads)
-- ============================================================
INSERT INTO lead_form_inputs (id, lead_id, form_unit, form_multifamily, form_square, form_year, form_bedrooms, form_bathrooms, form_repairs, form_occupied, form_sell_fast, form_owner, form_listed, form_scenario) VALUES
  ('ffffffff-0006-0000-0000-000000000010', 'eeeeeeee-0005-0000-0000-000000000010', 'Single', 'No', '1,800', '1992', '3', '2', 'Roof, HVAC',         'Occupied', 'Yes', 'Yes', 'Not listed', 'Downsizing'),
  ('ffffffff-0006-0000-0000-000000000011', 'eeeeeeee-0005-0000-0000-000000000011', 'Single', 'No', '2,200', '2001', '4', '3', 'Minor cosmetic',     'Vacant',   'Yes', 'Yes', 'Not listed', 'Foreclosure risk'),
  ('ffffffff-0006-0000-0000-000000000020', 'eeeeeeee-0005-0000-0000-000000000020', 'Single', 'No', '1,400', '1978', '3', '1', 'Foundation cracks',  'Occupied', 'Yes', 'Yes', 'Not listed', 'Inherited property'),
  ('ffffffff-0006-0000-0000-000000000021', 'eeeeeeee-0005-0000-0000-000000000021', 'Single', 'No', '1,950', '1985', '3', '2', 'Kitchen, bathrooms', 'Occupied', 'Yes', 'Yes', 'Not listed', 'Divorce'),
  ('ffffffff-0006-0000-0000-000000000050', 'eeeeeeee-0005-0000-0000-000000000050', 'Single', 'No', '2,100', '1999', '4', '2', 'None',               'Vacant',   'Yes', 'Yes', 'Not listed', 'Moving out of state'),
  ('ffffffff-0006-0000-0000-000000000051', 'eeeeeeee-0005-0000-0000-000000000051', 'Single', 'No', '1,600', '1969', '3', '1', 'Roof, plumbing',     'Occupied', 'Yes', 'Yes', 'Not listed', 'Financial hardship'),
  ('ffffffff-0006-0000-0000-000000000052', 'eeeeeeee-0005-0000-0000-000000000052', 'Single', 'No', '1,750', '1991', '3', '2', 'Windows',            'Occupied', 'Yes', 'Yes', 'Not listed', 'Downsizing'),
  ('ffffffff-0006-0000-0000-000000000060', 'eeeeeeee-0005-0000-0000-000000000060', 'Single', 'No', '2,400', '2004', '4', '3', 'None',               'Vacant',   'Yes', 'Yes', 'Not listed', 'Estate sale'),
  ('ffffffff-0006-0000-0000-000000000061', 'eeeeeeee-0005-0000-0000-000000000061', 'Single', 'No', '3,100', '2012', '5', '4', 'None',               'Occupied', 'Yes', 'Yes', 'Not listed', 'Upgrading')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Send Logs
-- ============================================================
INSERT INTO send_log (id, lead_id, buyer_id, source_id, campaign_id, status, response_code, response_body, send_source, created) VALUES
  -- Mia: manual → Compass success, Sellers fail
  ('11111111-0007-0000-0000-000000000001', 'eeeeeeee-0005-0000-0000-000000000050', 'f6529724-0eed-4551-bf60-83645a53496b', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', 'success', 200, '{"status":"accepted","lead_id":"cx_9912"}', 'manual', NOW() - INTERVAL '4 days'),
  ('11111111-0007-0000-0000-000000000002', 'eeeeeeee-0005-0000-0000-000000000050', 'f0ab85ea-226c-44f2-8853-5e9c4500d745', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', 'failed',  500, '{"error":"Internal server error"}',         'manual', NOW() - INTERVAL '4 days'),
  -- Noah: worker → iSpeedToLead success
  ('11111111-0007-0000-0000-000000000003', 'eeeeeeee-0005-0000-0000-000000000051', '3d3dbe46-5e70-454d-92e1-2dbda91b4feb', 'bbbbbbbb-0002-0000-0000-000000000003', 'dddddddd-0004-0000-0000-000000000003', 'success', 200, '{"status":"ok"}',                           'worker', NOW() - INTERVAL '2 days'),
  -- Olivia: manual → Compass success (disputed)
  ('11111111-0007-0000-0000-000000000004', 'eeeeeeee-0005-0000-0000-000000000052', 'f6529724-0eed-4551-bf60-83645a53496b', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', 'success', 200, '{"status":"accepted"}',                     'manual', NOW() - INTERVAL '5 days'),
  -- Paul: manual → Compass success (sold)
  ('11111111-0007-0000-0000-000000000005', 'eeeeeeee-0005-0000-0000-000000000060', 'f6529724-0eed-4551-bf60-83645a53496b', 'bbbbbbbb-0002-0000-0000-000000000001', 'dddddddd-0004-0000-0000-000000000001', 'success', 200, '{"status":"accepted","lead_id":"cx_8844"}', 'manual', NOW() - INTERVAL '7 days'),
  -- Quinn: worker → iSpeedToLead success (sold)
  ('11111111-0007-0000-0000-000000000006', 'eeeeeeee-0005-0000-0000-000000000061', '3d3dbe46-5e70-454d-92e1-2dbda91b4feb', 'bbbbbbbb-0002-0000-0000-000000000003', 'dddddddd-0004-0000-0000-000000000003', 'success', 200, '{"status":"ok"}',                           'worker', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

UPDATE send_log SET
  disputed = true, dispute_reason = 'Wrong contact info — phone disconnected',
  dispute_buyer_name = 'Compass', disputed_at = NOW() - INTERVAL '3 days'
  WHERE id = '11111111-0007-0000-0000-000000000004';

-- ============================================================
-- Lead Buyer Outcomes (sold)
-- ============================================================
INSERT INTO lead_buyer_outcomes (id, lead_id, buyer_id, status, sold_at, sold_price) VALUES
  ('22222222-0008-0000-0000-000000000001', 'eeeeeeee-0005-0000-0000-000000000060', 'f6529724-0eed-4551-bf60-83645a53496b', 'sold', NOW() - INTERVAL '6 days', 25000),
  ('22222222-0008-0000-0000-000000000002', 'eeeeeeee-0005-0000-0000-000000000061', '3d3dbe46-5e70-454d-92e1-2dbda91b4feb', 'sold', NOW() - INTERVAL '9 days', 18500)
ON CONFLICT DO NOTHING;

-- ============================================================
SELECT 'Test data seeded successfully' AS result;
