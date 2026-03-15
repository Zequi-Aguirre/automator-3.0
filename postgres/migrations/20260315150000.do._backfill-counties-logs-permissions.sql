-- Backfill counties.manage for users who have settings.manage
-- (counties were previously guarded by settings.manage)
INSERT INTO user_permissions (user_id, permission)
SELECT up.user_id, 'counties.manage'
FROM user_permissions up
WHERE up.permission = 'settings.manage'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up2
    WHERE up2.user_id = up.user_id
      AND up2.permission = 'counties.manage'
  );

-- Backfill logs.view for admin and superadmin users
-- (logs page was previously admin-role-gated)
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, 'logs.view'
FROM users u
WHERE u.deleted IS NULL
  AND u.role IN ('admin', 'superadmin')
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = u.id
      AND up.permission = 'logs.view'
  );
