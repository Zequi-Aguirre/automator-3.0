-- TICKET-064: Add needs_review stage for leads with missing required fields
-- When a lead is imported with missing first_name, last_name, phone, email, or address,
-- it is flagged as needs_review instead of entering the normal "Needs Verification" flow.
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS needs_review_reason TEXT;
