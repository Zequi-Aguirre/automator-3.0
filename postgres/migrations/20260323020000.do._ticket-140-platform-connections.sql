-- TICKET-140: Platform connections — encrypted external DB credentials for platformSync.
-- One row per Automator buyer. The worker queries the Northstar DB using these credentials
-- to pull the buyer's leads (last lookback_days days) and reconcile them.

-- pgcrypto is required for pgp_sym_encrypt / pgp_sym_decrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE platform_connections (
    id                  UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    automator_buyer_id  UUID        NOT NULL REFERENCES buyers(id),
    northstar_buyer_id  UUID        NOT NULL,   -- u.id in Northstar — filters the sync query
    label               VARCHAR(255),           -- optional display name (e.g. "SellersDirect - Buyer A")
    host                VARCHAR(255) NOT NULL,
    port                INTEGER     NOT NULL DEFAULT 5432,
    dbname              VARCHAR(255) NOT NULL,
    db_username         VARCHAR(255) NOT NULL,
    encrypted_password  TEXT        NOT NULL,   -- pgp_sym_encrypt(password, PLATFORM_SYNC_ENCRYPTION_KEY)
    lookback_days       INTEGER     NOT NULL DEFAULT 30,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    last_synced_at      TIMESTAMPTZ,
    created             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted             TIMESTAMPTZ,

    -- One active connection per buyer
    CONSTRAINT uq_pc_buyer UNIQUE (automator_buyer_id)
);

CREATE INDEX idx_pc_buyer     ON platform_connections (automator_buyer_id) WHERE deleted IS NULL;
CREATE INDEX idx_pc_active    ON platform_connections (is_active) WHERE deleted IS NULL;
