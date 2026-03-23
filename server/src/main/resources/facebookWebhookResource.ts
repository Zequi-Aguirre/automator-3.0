// TICKET-143: Facebook webhook endpoint
// No auth middleware — Facebook calls this directly.
// GET  /api/facebook/webhook — verification handshake
// POST /api/facebook/webhook — real-time lead events
import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import FacebookLeadService from '../services/facebookLeadService';
import { EnvConfig } from '../config/envConfig';
import { FacebookWebhookEntry } from '../types/facebookTypes';

@injectable()
export default class FacebookWebhookResource {
    private readonly router: Router;

    constructor(
        private readonly facebookLeadService: FacebookLeadService,
        private readonly config: EnvConfig,
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/facebook/webhook — Facebook verification challenge
        this.router.get('/', (req: Request, res: Response) => {
            const mode      = req.query['hub.mode'];
            const token     = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode === 'subscribe' && token === this.config.fbVerifyToken) {
                console.log('[FacebookWebhook] Verified');
                return res.status(200).send(challenge);
            }
            return res.status(403).send('Forbidden');
        });

        // POST /api/facebook/webhook — incoming lead events
        // Uses raw body for signature verification, then re-parses JSON
        this.router.post('/', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
            // Verify signature
            const signature = req.headers['x-hub-signature-256'] as string ?? '';
            if (this.config.fbAppSecret && !this.facebookLeadService.verifyWebhookSignature(req.body as Buffer, signature)) {
                console.warn('[FacebookWebhook] Invalid signature');
                return res.status(403).send('Invalid signature');
            }

            // Respond 200 immediately — Facebook requires response within 5s
            res.status(200).send('OK');

            // Process asynchronously
            try {
                const body = JSON.parse((req.body as Buffer).toString('utf8')) as {
                    object: string;
                    entry: FacebookWebhookEntry[];
                };

                if (body.object !== 'page') return;

                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        if (change.field !== 'leadgen') continue;
                        const { leadgen_id, page_id } = change.value;
                        console.log(`[FacebookWebhook] Lead received: ${leadgen_id} (page ${page_id})`);
                        this.facebookLeadService.processWebhookLead(leadgen_id, page_id).catch(err => {
                            console.error('[FacebookWebhook] processWebhookLead error:', err);
                        });
                    }
                }
            } catch (err) {
                console.error('[FacebookWebhook] Parse error:', err);
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
