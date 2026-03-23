-- TICKET-137: Platform buyer mappings
-- Persists user-confirmed (platform_buyer_id → automator_buyer_id) mappings so
-- they auto-fill on subsequent imports of the same platform.

CREATE TABLE platform_buyer_mappings (
    id                      SERIAL PRIMARY KEY,
    platform                VARCHAR(50)  NOT NULL,
    platform_buyer_id       UUID         NOT NULL,
    platform_buyer_name     VARCHAR(255),
    automator_buyer_id      UUID REFERENCES buyers(id),
    mapped_by               UUID REFERENCES users(id),
    mapped_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pbm_platform_buyer UNIQUE (platform, platform_buyer_id)
);
