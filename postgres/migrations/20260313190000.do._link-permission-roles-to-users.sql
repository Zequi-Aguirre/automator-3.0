-- Seed the default system roles into permission_roles so they appear in the UI
INSERT INTO permission_roles (name, permissions)
VALUES
    ('user',  '["leads.verify","leads.queue","leads.edit","activity.view","disputes.create"]'),
    ('admin', '["leads.verify","leads.queue","leads.import","leads.export","leads.send","leads.trash","leads.edit","leads.untrash","sources.manage","managers.manage","activity.view","trash_reasons.manage","disputes.create"]')
ON CONFLICT (name) DO NOTHING;

-- Add permission_role_id FK to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_role_id UUID REFERENCES permission_roles(id) ON DELETE SET NULL;

-- Backfill: link existing users to their matching permission role by name
UPDATE users u
SET permission_role_id = pr.id
FROM permission_roles pr
WHERE pr.name = u.role
  AND u.deleted IS NULL
  AND u.permission_role_id IS NULL;
