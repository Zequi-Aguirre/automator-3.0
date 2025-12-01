-- expire_after_hours
ALTER TABLE worker_settings
ADD COLUMN expire_after_hours INTEGER NOT NULL DEFAULT 18;

-- trashExpireLeads jobs
INSERT INTO public."jobs" (name, description, interval_minutes)
    VALUES ('trashExpireLeads', 'Trashes leads that have expired based on worker settings', 60);