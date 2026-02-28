-- Migration: Extend send_log with buyer_id and leads with worker_enabled
-- Ticket: TICKET-002
-- Description: Adds buyer_id to send_log (append-only, no unique constraints)
--              and worker_enabled to leads for worker gating

-- ========================================
-- UP Migration
-- ========================================

-- Add buyer_id to send_log (nullable for backward compatibility, FK to buyers)
ALTER TABLE send_log
ADD COLUMN buyer_id UUID REFERENCES buyers(id) ON DELETE SET NULL;

-- Create indexes for send_log.buyer_id
CREATE INDEX idx_send_log_buyer_id ON send_log(buyer_id);
CREATE INDEX idx_send_log_lead_buyer ON send_log(lead_id, buyer_id);
CREATE INDEX idx_send_log_buyer_created ON send_log(buyer_id, created DESC);

-- NOTE: NO unique constraint on send_log - it's append-only to allow retry attempts

-- Add worker_enabled to leads (controls worker processing)
ALTER TABLE leads
ADD COLUMN worker_enabled BOOLEAN NOT NULL DEFAULT false;

-- Create index for leads.worker_enabled (for worker queries)
CREATE INDEX idx_leads_worker_enabled ON leads(worker_enabled)
WHERE worker_enabled = true AND deleted IS NULL;

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_leads_worker_enabled;
-- ALTER TABLE leads DROP COLUMN IF EXISTS worker_enabled;
--
-- DROP INDEX IF EXISTS idx_send_log_buyer_created;
-- DROP INDEX IF EXISTS idx_send_log_lead_buyer;
-- DROP INDEX IF EXISTS idx_send_log_buyer_id;
-- ALTER TABLE send_log DROP COLUMN IF EXISTS buyer_id;
