-- TICKET-062: Remove unique constraint on leads.phone
-- Allow duplicate phone numbers across leads. The (source_id, external_lead_id)
-- uniqueness index already prevents duplicate re-ingestion from the same platform.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_phone_key;
