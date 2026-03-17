-- TICKET-107: Call request reasons master table
-- Admin-manageable dropdown of reasons used when requesting a call on a lead.
CREATE TABLE IF NOT EXISTS call_request_reasons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label       TEXT NOT NULL UNIQUE,
    active      BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,
    created     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO call_request_reasons (label, sort_order) VALUES
    ('Didn''t pick up',     10),
    ('Follow-up needed',    20),
    ('Requested callback',  30),
    ('Wrong number',        40),
    ('Other',               50)
ON CONFLICT (label) DO NOTHING;

-- Backfill permission for admins and superadmins
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, 'call_request_reasons.manage'
FROM users u
WHERE u.role IN ('admin', 'superadmin')
  AND NOT EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = u.id AND up.permission = 'call_request_reasons.manage'
  );
