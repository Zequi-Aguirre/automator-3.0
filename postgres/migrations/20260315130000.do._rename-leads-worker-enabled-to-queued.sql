-- Rename leads.worker_enabled to leads.queued
-- "worker_enabled" was ambiguous; "queued" clearly expresses that the lead is in the worker queue

ALTER TABLE leads RENAME COLUMN worker_enabled TO queued;
