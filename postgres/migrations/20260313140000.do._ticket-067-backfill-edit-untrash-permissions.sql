-- Migration: TICKET-067 — Backfill leads.edit + leads.untrash for existing users
-- Date: 2026-03-13
-- Description: The permissions system was introduced with leads.edit and leads.untrash
--              but the seed in the original migration did not include them.
--              This backfills them for all existing users based on role defaults:
--              user       → leads.edit
--              admin      → leads.edit
--              superadmin → leads.edit + leads.untrash

INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, p.permission
FROM public.users u
CROSS JOIN (
    VALUES
        ('user',       'leads.edit'),
        ('admin',      'leads.edit'),
        ('superadmin', 'leads.edit'),
        ('superadmin', 'leads.untrash')
) AS p(role, permission)
WHERE u.role = p.role
  AND u.deleted IS NULL
ON CONFLICT (user_id, permission) DO NOTHING;
