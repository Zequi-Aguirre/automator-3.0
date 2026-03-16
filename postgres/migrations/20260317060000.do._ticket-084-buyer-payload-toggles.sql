-- TICKET-084: Per-buyer payload toggles
-- send_lead_id: include internal lead ID in outgoing payload (for dispute matching)
-- send_private_note: include private note (MM-DD HH:mm - Platform - Campaign Name)
ALTER TABLE buyers
    ADD COLUMN IF NOT EXISTS send_lead_id BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS send_private_note BOOLEAN NOT NULL DEFAULT false;
