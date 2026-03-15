-- Add auto_queue_on_verify setting to worker_settings
-- When enabled, leads are automatically queued for the worker upon verification

ALTER TABLE worker_settings
    ADD COLUMN IF NOT EXISTS auto_queue_on_verify BOOLEAN NOT NULL DEFAULT false;
