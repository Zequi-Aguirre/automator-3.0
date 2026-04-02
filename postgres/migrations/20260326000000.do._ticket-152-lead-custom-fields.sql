-- TICKET-152: Lead Custom Fields
-- Creates the lead_custom_fields table for admin-managed field schema definitions.
-- Adds custom_fields JSONB column to leads for storing dynamic key-value data.
-- Fields are never hard-deleted — only deactivated (active = false).
CREATE TABLE lead_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    field_type VARCHAR(50) NOT NULL DEFAULT 'text',
    options JSONB DEFAULT NULL,
    required BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    auto_discovered BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT lead_custom_fields_key_unique UNIQUE (key),
    CONSTRAINT lead_custom_fields_key_format CHECK (key ~ '^[a-z][a-z0-9_]*$')
);
CREATE INDEX idx_lead_custom_fields_active ON lead_custom_fields (active);
CREATE INDEX idx_lead_custom_fields_sort ON lead_custom_fields (sort_order ASC, created_at ASC);
ALTER TABLE leads ADD COLUMN custom_fields JSONB DEFAULT NULL;
CREATE INDEX idx_leads_custom_fields_gin ON leads USING GIN (custom_fields);
-- Seed two example custom fields for testing
INSERT INTO lead_custom_fields (key, label, description, field_type, options, required, sort_order)
VALUES
    ('time_to_sell', 'Time to Sell', 'How soon is the seller looking to close?', 'select', '["ASAP","1-3 months","3-6 months","6-12 months","Not sure"]'::jsonb, false, 10),
    ('situation', 'Seller Situation', 'What is driving the sale?', 'text', NULL, false, 20);
