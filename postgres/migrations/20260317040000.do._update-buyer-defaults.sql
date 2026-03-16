-- Migration: Update default buyer settings
-- Description:
--   iSpeedToLead  → auto_send=false, allow_resell=false, enforce_county_cooldown=false
--   Compass       → manual_send=true, worker_send=true  (available for both modes)
--   Sellers       → manual_send=true, worker_send=true  (available for both modes)

-- iSpeedToLead: worker-only, no auto-send on import, no resell, no county cooldown
UPDATE buyers
SET
    auto_send              = false,
    allow_resell           = false,
    enforce_county_cooldown = false
WHERE name = 'iSpeedToLead'
  AND deleted IS NULL;

-- Compass and Sellers: available for both manual and worker dispatch
UPDATE buyers
SET
    manual_send = true,
    worker_send = true
WHERE name IN ('Compass', 'Sellers')
  AND deleted IS NULL;
