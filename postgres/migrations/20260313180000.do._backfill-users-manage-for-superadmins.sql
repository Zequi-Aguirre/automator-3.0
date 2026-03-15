-- Backfill users.manage permission for superadmins who don't have it yet.
-- Needed because existing superadmins predate this permission being seeded.
INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, 'users.manage'
FROM public.users u
WHERE u.role = 'superadmin'
  AND u.deleted IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = u.id AND up.permission = 'users.manage'
  );
