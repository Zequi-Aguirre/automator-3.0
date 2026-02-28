-- Migration: Drop investors and vendors tables
-- Ticket: TICKET-022
-- Description: Remove deprecated investors, vendors, and vendor_receives tables
--              These have been replaced by the buyers table architecture
-- ⚠️  WARNING: This migration is IRREVERSIBLE for data
--              All investor and vendor data will be permanently lost

-- ========================================
-- UP Migration (Drop tables)
-- ========================================

-- Step 1: Drop foreign key constraints on leads table
ALTER TABLE leads DROP CONSTRAINT IF EXISTS fk_investor;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_investor_id_fkey;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_vendor_id_fkey;

-- Step 2: Drop foreign key constraints on send_log table
ALTER TABLE send_log DROP CONSTRAINT IF EXISTS send_log_investor_id_fkey;
ALTER TABLE send_log DROP CONSTRAINT IF EXISTS send_log_vendor_id_fkey;

-- Step 3: Drop columns from leads table
ALTER TABLE leads DROP COLUMN IF EXISTS investor_id;
ALTER TABLE leads DROP COLUMN IF EXISTS vendor_id;

-- Step 4: Drop columns from send_log table
ALTER TABLE send_log DROP COLUMN IF EXISTS investor_id;
ALTER TABLE send_log DROP COLUMN IF EXISTS vendor_id;

-- Step 5: Drop tables
DROP TABLE IF EXISTS investors;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS vendor_receives;

-- ========================================
-- DOWN Migration (Rollback - NOT RECOMMENDED)
-- ========================================
-- ⚠️  WARNING: Rollback will recreate empty tables
--              Original data CANNOT be restored

-- Uncomment below to enable rollback (NOT RECOMMENDED):

/*
-- Recreate investors table
CREATE TABLE public.investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    blacklisted BOOLEAN DEFAULT FALSE,
    created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    modified TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Recreate vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    weight INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Recreate vendor_receives table
CREATE TABLE vendor_receives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate columns on leads
ALTER TABLE leads ADD COLUMN investor_id UUID;
ALTER TABLE leads ADD COLUMN vendor_id UUID;

-- Recreate columns on send_log
ALTER TABLE send_log ADD COLUMN investor_id UUID;
ALTER TABLE send_log ADD COLUMN vendor_id UUID;

-- Recreate foreign keys
ALTER TABLE leads
ADD CONSTRAINT fk_investor
FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE SET NULL;

ALTER TABLE leads
ADD CONSTRAINT leads_vendor_id_fkey
FOREIGN KEY (vendor_id) REFERENCES vendors(id);

ALTER TABLE send_log
ADD CONSTRAINT send_log_investor_id_fkey
FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE SET NULL;

ALTER TABLE send_log
ADD CONSTRAINT send_log_vendor_id_fkey
FOREIGN KEY (vendor_id) REFERENCES vendors(id);
*/
