import { injectable } from 'tsyringe';
import axios from 'axios';
import { EnvConfig } from '../config/envConfig';

export type EmailPayload = {
    to: string;
    subject: string;
    html: string;
};

/**
 * Sends transactional emails via Make.com webhook.
 *
 * Make scenario expects: { to, subject, html }
 * and forwards to Gmail via the configured sender account.
 *
 * Set MAKE_EMAIL_WEBHOOK_URL in Doppler/env.
 */
@injectable()
export default class EmailService {
    constructor(private readonly config: EnvConfig) {}

    async send(payload: EmailPayload): Promise<void> {
        if (!this.config.makeEmailWebhookUrl) {
            console.warn('[EmailService] MAKE_EMAIL_WEBHOOK_URL not set — skipping email send');
            console.info('[EmailService] Would have sent:', { to: payload.to, subject: payload.subject });
            return;
        }

        try {
            await axios.post(this.config.makeEmailWebhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            });
        } catch (err) {
            // Non-fatal — log and continue so the calling flow isn't blocked
            console.error('[EmailService] Failed to send email via Make.com:', err);
        }
    }
}
