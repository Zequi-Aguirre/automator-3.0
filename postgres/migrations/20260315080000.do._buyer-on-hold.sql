-- TICKET: Buyer On Hold
-- Adds on_hold flag to buyers table. When true, the worker skips this buyer
-- and the hold toggle action is permission-gated + activity-logged.

ALTER TABLE buyers ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT FALSE;
