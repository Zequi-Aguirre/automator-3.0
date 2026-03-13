-- Add payload_format to buyers table
-- 'default'   → sends first_name, last_name, zipcode (original format)
-- 'northstar' → sends name (combined), zip_code (Northstar/Compass/SellersDirect intake format)

ALTER TABLE buyers
    ADD COLUMN IF NOT EXISTS payload_format VARCHAR(20) NOT NULL DEFAULT 'default';
