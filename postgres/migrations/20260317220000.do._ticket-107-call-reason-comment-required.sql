-- Add comment_required flag to call_request_reasons (default optional; 'Other' is mandatory by default).
-- Add call_request_note to leads to store the comment submitted with a call request.
ALTER TABLE call_request_reasons ADD COLUMN comment_required BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE call_request_reasons SET comment_required = TRUE WHERE label = 'Other';

ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_request_note TEXT;
