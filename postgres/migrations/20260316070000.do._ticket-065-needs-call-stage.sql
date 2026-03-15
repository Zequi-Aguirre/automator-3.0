-- TICKET-065: Add needs_call stage and call tracking fields to leads
-- Allows staff to flag a lead for phone follow-up, log call attempts, and record outcomes.
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS needs_call BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS call_reason TEXT,
    ADD COLUMN IF NOT EXISTS call_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS call_requested_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS call_executed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS call_executed_by UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS call_outcome VARCHAR(50),
    ADD COLUMN IF NOT EXISTS call_outcome_notes TEXT,
    ADD COLUMN IF NOT EXISTS call_attempts INTEGER NOT NULL DEFAULT 0;
