-- TICKET-066: Add send_source to send_log for dispatch method filtering
-- Values: 'manual' (user-initiated), 'worker' (background worker), 'auto_send' (auto on import)
ALTER TABLE send_log
    ADD COLUMN IF NOT EXISTS send_source VARCHAR(20);
