-- The `sent` and `sent_date` columns on the leads table are no longer used.
-- Lead dispatch tracking is fully handled by the send_log table (lead_buyer_outcomes).
-- The trash expiration job already guards sent leads via a NOT EXISTS query on send_log.
-- Dropping these columns removes the erroneous edit/verify lock they were causing.
ALTER TABLE leads
    DROP COLUMN IF EXISTS sent,
    DROP COLUMN IF EXISTS sent_date;
