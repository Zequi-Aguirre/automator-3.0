-- 1️⃣ Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    weight INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2️⃣ Add vendor_id column to send_logs (nullable, to avoid downtime)
ALTER TABLE send_logs ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

-- 3️⃣ Add vendor_id column to leads (nullable)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);

-- 4️⃣ Insert initial vendor (iSpeedToLeadIAO)
INSERT INTO vendors (name, active, weight)
SELECT 'iSpeedToLeadIAO', TRUE, 100
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE name = 'iSpeedToLeadIAO');

-- 5️⃣ Backfill send_logs.vendor_id with iSpeedToLeadIAO’s id
UPDATE send_logs
SET vendor_id = v.id
FROM vendors v
WHERE v.name = 'iSpeedToLeadIAO'
  AND send_logs.vendor_id IS NULL;

-- 6️⃣ Backfill leads.vendor_id based on send_logs
UPDATE leads
SET vendor_id = v.id
FROM vendors v
WHERE v.name = 'iSpeedToLeadIAO'
  AND leads.id IN (
    SELECT DISTINCT lead_id FROM send_logs WHERE vendor_id = v.id
  )
  AND leads.vendor_id IS NULL;

