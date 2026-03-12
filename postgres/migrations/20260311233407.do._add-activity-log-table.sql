-- Activity log: tracks every significant action in the system.
-- user_id is nullable — NULL means the action was triggered by the system (worker, API intake).
-- lead_id is nullable — non-lead actions (source created, buyer created, etc.) use entity_type/entity_id instead.
CREATE TABLE activity_log (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
    lead_id      UUID        REFERENCES leads(id) ON DELETE SET NULL,
    entity_type  TEXT,
    entity_id    UUID,
    action       TEXT        NOT NULL,
    action_details JSONB,
    created      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_lead_id  ON activity_log(lead_id)  WHERE lead_id  IS NOT NULL;
CREATE INDEX idx_activity_log_user_id  ON activity_log(user_id)  WHERE user_id  IS NOT NULL;
CREATE INDEX idx_activity_log_action   ON activity_log(action);
CREATE INDEX idx_activity_log_created  ON activity_log(created DESC);
