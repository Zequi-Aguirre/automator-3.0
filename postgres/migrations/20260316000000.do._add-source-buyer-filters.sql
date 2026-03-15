-- Add buyer filter columns to sources table
-- buyer_filter_mode: null = no filter, 'include' = only send to listed buyers, 'exclude' = send to all except listed
-- buyer_filter_buyer_ids: the buyer IDs the mode applies to

ALTER TABLE sources
    ADD COLUMN buyer_filter_mode VARCHAR(10) DEFAULT NULL
        CHECK (buyer_filter_mode IN ('include', 'exclude')),
    ADD COLUMN buyer_filter_buyer_ids UUID[] NOT NULL DEFAULT '{}';
