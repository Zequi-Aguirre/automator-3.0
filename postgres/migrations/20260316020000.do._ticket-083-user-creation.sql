-- TICKET-083: User management — add must_change_password flag
ALTER TABLE users
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
