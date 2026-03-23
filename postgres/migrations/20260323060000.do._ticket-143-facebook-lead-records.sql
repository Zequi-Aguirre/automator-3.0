-- TICKET-143: Facebook lead records — store form submissions + attribution

-- ── Sources: add Facebook page credentials ───────────────────────────────────
ALTER TABLE sources
    ADD COLUMN IF NOT EXISTS fb_page_id    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS fb_page_token TEXT;  -- long-lived Page Access Token

-- ── facebook_lead_records ─────────────────────────────────────────────────────
-- One row per Facebook Lead Ads form submission.
-- Populated via webhook (real-time) and historical pull (one-time per source).

CREATE TABLE IF NOT EXISTS facebook_lead_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Facebook identifiers
    fb_lead_id          VARCHAR(255) NOT NULL UNIQUE,  -- leadgen_id from Facebook
    fb_form_id          VARCHAR(255),
    fb_form_name        VARCHAR(255),
    fb_page_id          VARCHAR(255),
    fb_ad_id            VARCHAR(255),
    fb_ad_name          VARCHAR(255),
    fb_adset_id         VARCHAR(255),
    fb_adset_name       VARCHAR(255),
    fb_campaign_id      VARCHAR(255),
    fb_campaign_name    VARCHAR(255),

    -- Extracted contact info (used for matching)
    phone               VARCHAR(50),
    phone_normalized    VARCHAR(15),
    email               VARCHAR(255),

    -- Full raw field data from Facebook (all form answers as JSONB)
    field_data          JSONB NOT NULL DEFAULT '[]',

    -- Automator linkage
    source_id           UUID REFERENCES sources(id),
    automator_campaign_id UUID REFERENCES campaigns(id),  -- matched campaign by external_form_id
    automator_lead_id   UUID REFERENCES leads(id),        -- matched after phone/email lookup

    -- Match result
    match_status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'matched' | 'unmatched'

    -- Timestamps
    fb_created_time     TIMESTAMPTZ,   -- when Facebook received the submission
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fb_leads_phone    ON facebook_lead_records (phone_normalized);
CREATE INDEX IF NOT EXISTS idx_fb_leads_email    ON facebook_lead_records (email);
CREATE INDEX IF NOT EXISTS idx_fb_leads_status   ON facebook_lead_records (match_status);
CREATE INDEX IF NOT EXISTS idx_fb_leads_form     ON facebook_lead_records (fb_form_id);
CREATE INDEX IF NOT EXISTS idx_fb_leads_source   ON facebook_lead_records (source_id);
