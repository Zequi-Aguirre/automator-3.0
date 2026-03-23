-- TICKET-136: Platform lead records — reconciliation schema
-- Stores CSV rows imported from Northstar (Sellers/Compass/Pickle) Metabase exports.
-- After import, rows are matched to Automator leads by normalized phone + email,
-- then used to upsert lead_buyer_outcomes with confirmed sale/dispute data.

-- ── Import batches ────────────────────────────────────────────────────────────
-- One record per CSV upload event.

CREATE TABLE platform_import_batches (
    id              SERIAL PRIMARY KEY,
    platform        VARCHAR(50)  NOT NULL,  -- 'sellers' | 'compass' | 'pickle'
    filename        VARCHAR(500),
    row_count       INTEGER,
    imported_by     UUID REFERENCES users(id),
    imported_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Platform lead records ─────────────────────────────────────────────────────
-- One record per row in the Metabase CSV export.
-- Northstar columns map directly from the reconciliation query in docs/11-metabase-reconciliation-queries.md

CREATE TABLE platform_lead_records (
    id                          SERIAL PRIMARY KEY,
    import_batch_id             INTEGER      NOT NULL REFERENCES platform_import_batches(id),
    platform                    VARCHAR(50)  NOT NULL,  -- 'sellers' | 'compass' | 'pickle'

    -- Northstar identifiers
    -- platform + platform_buyer_lead_id is the upsert key — re-importing the same CSV updates, not duplicates
    platform_lead_id            UUID,        -- northstar_lead_id
    platform_buyer_lead_id      UUID         NOT NULL,  -- northstar_buyer_lead_id (stable; used as dedup key)
    platform_buyer_id           UUID,        -- northstar_buyer_id
    platform_buyer_name         VARCHAR(255),
    platform_buyer_email        VARCHAR(255),
    platform_buyer_products     TEXT[],      -- buyer_products array (e.g. ['sellers direct'])

    -- Contact fields (used for matching)
    phone                       VARCHAR(50),
    phone_normalized            VARCHAR(15), -- digits only, leading country code stripped
    email                       VARCHAR(255),

    -- Campaign / source info
    campaign_name               VARCHAR(255),
    import_note                 TEXT,        -- lead_activities.note where reason='imported' (contains our private note)

    -- Timeline
    received_at                 TIMESTAMPTZ, -- when platform got the lead (leads.created in Northstar)
    sent_out_at                 TIMESTAMPTZ, -- when platform sent to their buyer (buyer_leads.sent_date)
    buyer_lead_created_at       TIMESTAMPTZ,

    -- Outcome
    buyer_lead_status           VARCHAR(50), -- new | viewed | archived
    buyer_confirmed             BOOLEAN,
    price_cents                 INTEGER,     -- price (dollars) * 100

    -- Dispute
    disputed                    BOOLEAN      NOT NULL DEFAULT FALSE,
    dispute_reason              TEXT,
    dispute_status              VARCHAR(50), -- Pending | Approved | Rejected
    dispute_date                TIMESTAMPTZ,
    disputed_at                 TIMESTAMPTZ,

    -- Automator match (filled after matching engine runs)
    automator_lead_id           UUID REFERENCES leads(id),
    automator_send_log_id       UUID REFERENCES send_log(id),
    automator_buyer_id          UUID REFERENCES buyers(id),
    match_status                VARCHAR(20)  NOT NULL DEFAULT 'pending',
    -- 'pending' | 'matched' | 'unmatched' | 'ambiguous'

    created                     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_imported_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),  -- updated on every re-import

    -- Upsert key: same buyer_lead from same platform is one canonical record, updated on re-import
    CONSTRAINT uq_plr_platform_buyer_lead UNIQUE (platform, platform_buyer_lead_id)
);

CREATE INDEX idx_plr_import_batch    ON platform_lead_records (import_batch_id);
CREATE INDEX idx_plr_platform        ON platform_lead_records (platform);
CREATE INDEX idx_plr_phone           ON platform_lead_records (phone_normalized);
CREATE INDEX idx_plr_email           ON platform_lead_records (email);
CREATE INDEX idx_plr_match_status    ON platform_lead_records (match_status);
CREATE INDEX idx_plr_automator_lead  ON platform_lead_records (automator_lead_id);
