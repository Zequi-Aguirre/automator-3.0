ALTER TABLE leads
ADD COLUMN deleted_reason TEXT;

-- Optional cleanup if you want an index later:
CREATE INDEX idx_leads_deleted_reason ON leads(deleted_reason);

ALTER TABLE investors
ADD COLUMN whitelisted BOOLEAN DEFAULT FALSE;

ALTER TABLE counties
ADD COLUMN whitelisted BOOLEAN DEFAULT FALSE;

ALTER TABLE campaigns
ADD COLUMN whitelisted BOOLEAN DEFAULT FALSE;

ALTER TABLE affiliates
ADD COLUMN whitelisted BOOLEAN DEFAULT FALSE;

ALTER TABLE worker_settings
ADD COLUMN worker_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE worker_settings
ADD COLUMN cron_schedule TEXT;

-- optional: set a default so old installs don’t explode
UPDATE worker_settings
SET cron_schedule = '* * * * *'
WHERE cron_schedule IS NULL;

ALTER TABLE worker_settings
ALTER COLUMN cron_schedule SET NOT NULL;