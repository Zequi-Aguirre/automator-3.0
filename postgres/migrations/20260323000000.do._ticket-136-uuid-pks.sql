-- TICKET-136 amendment: Convert platform reconciliation table IDs to UUID PKs.
-- These tables are new (TICKET-136/137) and contain no production data to preserve.

DROP TABLE IF EXISTS platform_lead_records;
DROP TABLE IF EXISTS platform_buyer_mappings;
DROP TABLE IF EXISTS platform_import_batches;

-- ── Import batches ────────────────────────────────────────────────────────────

CREATE TABLE platform_import_batches (
    id              UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    platform        VARCHAR(50)  NOT NULL,
    filename        VARCHAR(500),
    row_count       INTEGER,
    imported_by     UUID REFERENCES users(id),
    imported_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Platform lead records ─────────────────────────────────────────────────────

CREATE TABLE platform_lead_records (
    id                          UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    import_batch_id             UUID         NOT NULL REFERENCES platform_import_batches(id),
    platform                    VARCHAR(50)  NOT NULL,

    platform_lead_id            UUID,
    platform_buyer_lead_id      UUID         NOT NULL,
    platform_buyer_id           UUID,
    platform_buyer_name         VARCHAR(255),
    platform_buyer_email        VARCHAR(255),
    platform_buyer_products     TEXT[],

    phone                       VARCHAR(50),
    phone_normalized            VARCHAR(15),
    email                       VARCHAR(255),

    campaign_name               VARCHAR(255),
    import_note                 TEXT,

    received_at                 TIMESTAMPTZ,
    sent_out_at                 TIMESTAMPTZ,
    buyer_lead_created_at       TIMESTAMPTZ,

    buyer_lead_status           VARCHAR(50),
    buyer_confirmed             BOOLEAN,
    price_cents                 INTEGER,

    disputed                    BOOLEAN      NOT NULL DEFAULT FALSE,
    dispute_reason              TEXT,
    dispute_status              VARCHAR(50),
    dispute_date                TIMESTAMPTZ,
    disputed_at                 TIMESTAMPTZ,

    automator_lead_id           UUID REFERENCES leads(id),
    automator_send_log_id       UUID REFERENCES send_log(id),
    automator_buyer_id          UUID REFERENCES buyers(id),
    match_status                VARCHAR(20)  NOT NULL DEFAULT 'pending',

    created                     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_imported_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_plr_platform_buyer_lead UNIQUE (platform, platform_buyer_lead_id)
);

CREATE INDEX idx_plr_import_batch    ON platform_lead_records (import_batch_id);
CREATE INDEX idx_plr_platform        ON platform_lead_records (platform);
CREATE INDEX idx_plr_phone           ON platform_lead_records (phone_normalized);
CREATE INDEX idx_plr_email           ON platform_lead_records (email);
CREATE INDEX idx_plr_match_status    ON platform_lead_records (match_status);
CREATE INDEX idx_plr_automator_lead  ON platform_lead_records (automator_lead_id);

-- ── Platform buyer mappings ───────────────────────────────────────────────────

CREATE TABLE platform_buyer_mappings (
    id                      UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    platform                VARCHAR(50)  NOT NULL,
    platform_buyer_id       UUID         NOT NULL,
    platform_buyer_name     VARCHAR(255),
    automator_buyer_id      UUID REFERENCES buyers(id),
    mapped_by               UUID REFERENCES users(id),
    mapped_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pbm_platform_buyer UNIQUE (platform, platform_buyer_id)
);
