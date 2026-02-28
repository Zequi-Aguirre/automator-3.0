-- Migration: Create buyers table and lead_buyer_outcomes table
-- Ticket: TICKET-001
-- Description: Creates buyers table with timing columns directly (no separate schedule table)
--              and lead_buyer_outcomes table for many-to-many sold status tracking

-- ========================================
-- UP Migration
-- ========================================

-- Create buyers table with timing columns directly
CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    webhook_url TEXT NOT NULL,
    dispatch_mode VARCHAR(20) DEFAULT 'manual' CHECK (dispatch_mode IN ('manual', 'worker', 'both')),
    priority INTEGER NOT NULL UNIQUE,
    auto_send BOOLEAN DEFAULT false,
    allow_resell BOOLEAN DEFAULT true,
    requires_validation BOOLEAN DEFAULT false,

    -- Per-buyer timing (directly on buyers table, no separate schedule table)
    min_minutes_between_sends INTEGER DEFAULT 4,
    max_minutes_between_sends INTEGER DEFAULT 11,
    next_send_at TIMESTAMP WITH TIME ZONE,
    last_send_at TIMESTAMP WITH TIME ZONE,
    total_sends INTEGER DEFAULT 0,

    -- Flexible authentication (application-level encryption, NOT pgcrypto)
    auth_header_name VARCHAR(255) DEFAULT 'Authorization',
    auth_header_prefix VARCHAR(50),  -- e.g., 'Bearer ' or NULL
    auth_token_encrypted TEXT,  -- Encrypted by application using Node crypto

    -- Audit timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for buyers table
CREATE INDEX idx_buyers_priority ON buyers(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_buyers_auto_send ON buyers(auto_send, deleted_at) WHERE auto_send = true;
CREATE INDEX idx_buyers_dispatch_mode ON buyers(dispatch_mode, deleted_at);
CREATE INDEX idx_buyers_next_send ON buyers(next_send_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_buyers_deleted ON buyers(deleted_at);

-- Create many-to-many sold status table
CREATE TABLE IF NOT EXISTS lead_buyer_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    buyer_id UUID REFERENCES buyers(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'sold',
    sold_at TIMESTAMP WITH TIME ZONE,
    sold_price NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Unique constraint: one outcome per lead-buyer pair (when not soft-deleted)
CREATE UNIQUE INDEX idx_lead_buyer_outcomes_unique
ON lead_buyer_outcomes(lead_id, buyer_id)
WHERE deleted_at IS NULL;

-- Indexes for lead_buyer_outcomes table
CREATE INDEX idx_lead_buyer_outcomes_lead ON lead_buyer_outcomes(lead_id);
CREATE INDEX idx_lead_buyer_outcomes_buyer ON lead_buyer_outcomes(buyer_id);
CREATE INDEX idx_lead_buyer_outcomes_status ON lead_buyer_outcomes(status);
CREATE INDEX idx_lead_buyer_outcomes_deleted ON lead_buyer_outcomes(deleted_at);

-- ========================================
-- DOWN Migration (Rollback)
-- ========================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_lead_buyer_outcomes_deleted;
-- DROP INDEX IF EXISTS idx_lead_buyer_outcomes_status;
-- DROP INDEX IF EXISTS idx_lead_buyer_outcomes_buyer;
-- DROP INDEX IF EXISTS idx_lead_buyer_outcomes_lead;
-- DROP INDEX IF EXISTS idx_lead_buyer_outcomes_unique;
-- DROP TABLE IF EXISTS lead_buyer_outcomes;
--
-- DROP INDEX IF EXISTS idx_buyers_deleted;
-- DROP INDEX IF EXISTS idx_buyers_next_send;
-- DROP INDEX IF EXISTS idx_buyers_dispatch_mode;
-- DROP INDEX IF EXISTS idx_buyers_auto_send;
-- DROP INDEX IF EXISTS idx_buyers_priority;
-- DROP TABLE IF EXISTS buyers;
