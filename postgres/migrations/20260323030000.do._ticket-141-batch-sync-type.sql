-- TICKET-141: Track how a batch was created — CSV upload vs automated DB sync.
-- Also links batches created by the platformSync job to their platform_connection.

ALTER TABLE platform_import_batches
    ADD COLUMN IF NOT EXISTS sync_type             VARCHAR(10) NOT NULL DEFAULT 'csv',
    ADD COLUMN IF NOT EXISTS platform_connection_id UUID REFERENCES platform_connections(id);
