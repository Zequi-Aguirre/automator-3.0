-- TICKET-141: re-add automator_buyer_id to platform_connections
-- Each connection is per-buyer (not per-DB globally)

ALTER TABLE platform_connections
    ADD COLUMN IF NOT EXISTS automator_buyer_id UUID REFERENCES buyers(id);
