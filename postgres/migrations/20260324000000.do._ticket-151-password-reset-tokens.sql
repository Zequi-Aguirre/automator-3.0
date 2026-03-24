-- TICKET-151: Magic-link password reset
-- Stores short-lived tokens for email-based password set/reset flows.

CREATE TABLE password_reset_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT        NOT NULL UNIQUE,
    created    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_prt_token   ON password_reset_tokens(token);
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
