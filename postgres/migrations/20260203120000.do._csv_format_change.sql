-- Add private_notes column to leads table
ALTER TABLE leads ADD COLUMN private_notes TEXT;

-- Drop imported_at column (no longer used)
ALTER TABLE leads DROP COLUMN IF EXISTS imported_at;
