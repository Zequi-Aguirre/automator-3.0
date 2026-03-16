-- Migration: TICKET-105 — Backfill per-tab view permissions for existing users
-- Date: 2026-03-17
-- Description: Adds leads.view_verified, leads.view_needs_review, leads.view_needs_call
--              permissions. All existing users get all three — they can be revoked
--              individually per user via the permissions UI.

INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, p.permission
FROM public.users u
CROSS JOIN (
    VALUES
        ('leads.view_verified'),
        ('leads.view_needs_review'),
        ('leads.view_needs_call')
) AS p(permission)
WHERE u.deleted IS NULL
ON CONFLICT (user_id, permission) DO NOTHING;
