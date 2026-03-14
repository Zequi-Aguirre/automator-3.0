CREATE TABLE public.permission_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '[]',
    created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
