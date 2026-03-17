ALTER TABLE trash_reasons ADD COLUMN comment_required BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE trash_reasons SET comment_required = TRUE WHERE label = 'Other';
