-- Backfill activity.view for all non-worker users who don't already have it
-- (permission added in TICKET-105 era, existing users may be missing it)
INSERT INTO user_permissions (user_id, permission)
SELECT u.id, 'activity.view'
FROM users u
WHERE u.deleted IS NULL
  AND u.role != 'worker'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = u.id
      AND up.permission = 'activity.view'
  );
