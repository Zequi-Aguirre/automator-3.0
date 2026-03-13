-- Migration: TICKET-062 + TICKET-063
-- Date: 2026-03-13

-- ============================================================
-- TICKET-062: Trash reasons master table
-- ============================================================

CREATE TABLE IF NOT EXISTS trash_reasons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label       TEXT NOT NULL UNIQUE,
    active      BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,
    created     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO trash_reasons (label, sort_order) VALUES
    ('Property was listed',     10),
    ('Duplicate lead',          20),
    ('Bad contact info',        30),
    ('Outside service area',    40),
    ('Not interested',          50),
    ('Other',                   99)
ON CONFLICT (label) DO NOTHING;

-- ============================================================
-- TICKET-062: New permission + backfill
-- ============================================================

INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, p.permission
FROM public.users u
CROSS JOIN (
    VALUES
        ('admin',      'trash_reasons.manage'),
        ('superadmin', 'trash_reasons.manage')
) AS p(role, permission)
WHERE u.role = p.role
  AND u.deleted IS NULL
ON CONFLICT (user_id, permission) DO NOTHING;

-- ============================================================
-- TICKET-063: Dispute columns on send_log
-- ============================================================

ALTER TABLE send_log
    ADD COLUMN IF NOT EXISTS disputed            BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS dispute_reason      TEXT,
    ADD COLUMN IF NOT EXISTS dispute_buyer_name  TEXT,
    ADD COLUMN IF NOT EXISTS disputed_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disputed_by         UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_send_log_disputed
    ON send_log(lead_id) WHERE disputed = true;

-- ============================================================
-- TICKET-063: New permissions + backfill
-- ============================================================

INSERT INTO public.user_permissions (user_id, permission)
SELECT u.id, p.permission
FROM public.users u
CROSS JOIN (
    VALUES
        ('user',       'disputes.create'),
        ('admin',      'disputes.create'),
        ('superadmin', 'disputes.create')
) AS p(role, permission)
WHERE u.role = p.role
  AND u.deleted IS NULL
ON CONFLICT (user_id, permission) DO NOTHING;
