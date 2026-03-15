-- Backfill leads.read permission for all existing users
-- leads.read is now required to see the leads page and is granted to all roles

INSERT INTO user_permissions (user_id, permission)
SELECT u.id, 'leads.read'
FROM users u
WHERE u.deleted IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = u.id
      AND up.permission = 'leads.read'
  );
