-- Migration: TICKET-105 — Backfill remaining per-tab view permissions
-- Date: 2026-03-17
-- Description: Adds leads.view_new (all roles), leads.view_sent, leads.view_sold,
--              leads.view_trash (admin + superadmin only, matching previous tab visibility).

-- leads.view_new — everyone who can read leads can see the Needs Verification tab
INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, 'leads.view_new'
FROM public.users u
WHERE u.deleted IS NULL
ON CONFLICT (user_id, permission) DO NOTHING;

-- leads.view_sent + leads.view_sold + leads.view_trash — admin and superadmin only
INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, p.permission
FROM public.users u
CROSS JOIN (
    VALUES
        ('leads.view_sent'),
        ('leads.view_sold'),
        ('leads.view_trash')
) AS p(permission)
WHERE u.role IN ('admin', 'superadmin')
  AND u.deleted IS NULL
ON CONFLICT (user_id, permission) DO NOTHING;
