-- TICKET-141 fix: platform_connections is a connection to a DATABASE, not to a specific buyer.
-- Drop the buyer-specific columns and the per-buyer unique constraint.
-- Buyer→Automator mapping is handled by platform_buyer_mappings, not the connection.

ALTER TABLE platform_connections
    DROP CONSTRAINT IF EXISTS uq_pc_buyer,
    DROP COLUMN IF EXISTS automator_buyer_id,
    DROP COLUMN IF EXISTS northstar_buyer_id;
