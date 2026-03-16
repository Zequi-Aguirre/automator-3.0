-- Migration: Add system@automator service account and remove dev-only test accounts
-- Description:
--   1. Creates the System/Worker service account used to attribute automated
--      activity log entries (worker sends, lead expiry, auto-queue, etc.).
--   2. Soft-deletes dev-only test accounts (admin@admin.com, user@user.com,
--      worker@worker.com) so that all real users must request access via the UI.

-- 1. Create system service account
INSERT INTO public."users" (id, email, encrypted_password, name, role)
VALUES (
    '123e4567-e89b-12d3-b456-226600000104',
    'system@automator',
    '$2a$10$sBzl26chOVAX51kMMXBJz.Mh5CV7Jyzcsge1nZqVIDPIqnXJsvDBG',
    'System',
    'worker'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name  = EXCLUDED.name,
    role  = EXCLUDED.role;

-- 2. Soft-delete test accounts — users must request access through the application
UPDATE public."users"
SET deleted = NOW()
WHERE email IN ('admin@admin.com', 'user@user.com', 'worker@worker.com')
  AND deleted IS NULL;
