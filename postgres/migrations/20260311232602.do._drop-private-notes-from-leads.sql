-- Drop private_notes from leads. This data is now derivable from structured fields:
-- lead arrival time -> leads.created, platform -> campaigns.platform, campaign name -> campaigns.external_campaign_name
ALTER TABLE leads DROP COLUMN IF EXISTS private_notes;
