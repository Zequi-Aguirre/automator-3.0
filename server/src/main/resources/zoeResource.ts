// TICKET-128, TICKET-130, TICKET-131 — Zoe API routes
import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import ZoeService from '../services/zoeService';
import ZoeKeyService from '../services/zoeKeyService';
import ZoeConfigDAO from '../data/zoeConfigDAO';
import { ZoeAuthenticator } from '../middleware/zoeAuth';
import { requirePermission } from '../middleware/requirePermission';
import { ZoePermission } from '../types/permissionTypes';
import ActivityService from '../services/activityService';
import { ZoeAction } from '../types/activityTypes';

@injectable()
export default class ZoeResource {
    // managementRouter: session-authed routes (/api/zoe)
    private readonly managementRouter: Router;
    // externalRouter: Zoe Bearer-token routes (/api/zoe-ask)
    private readonly externalRouter: Router;

    constructor(
        private readonly zoeService: ZoeService,
        private readonly zoeKeyService: ZoeKeyService,
        private readonly zoeConfigDAO: ZoeConfigDAO,
        private readonly zoeAuthenticator: ZoeAuthenticator,
        private readonly activityService: ActivityService,
    ) {
        this.managementRouter = express.Router();
        this.externalRouter = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        const zoeAuth = this.zoeAuthenticator.authenticateFunc();

        // ── POST /api/zoe-ask — Custom GPT endpoint (Zoe Bearer token) ────────
        this.externalRouter.post('/', zoeAuth, async (req: Request, res: Response) => {
            const { question, conversation_id } = req.body as { question?: string; conversation_id?: string };
            if (!question?.trim()) {
                return res.status(400).json({ error: 'question is required' });
            }

            const response = await this.zoeService.ask({ question: question.trim(), conversation_id });

            void this.activityService.log({
                user_id: null,
                action: ZoeAction.ASKED,
                action_details: {
                    request_id: response.request_id,
                    question,
                    conversation_id,
                    status: response.status,
                },
            });

            res.status(200).json(response);
        });

        // ── API key management (session auth + superadmin permission) ─────────

        this.managementRouter.get('/keys', requirePermission(ZoePermission.MANAGE_KEYS), async (_req: Request, res: Response) => {
            try {
                res.status(200).json(await this.zoeKeyService.getAll());
            } catch (err) {
                res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
            }
        });

        this.managementRouter.post('/keys', requirePermission(ZoePermission.MANAGE_KEYS), async (req: Request, res: Response) => {
            try {
                const { name } = req.body as { name?: string };
                if (!name?.trim()) return res.status(400).json({ error: 'Key name is required' });
                const result = await this.zoeKeyService.create(name, req.user?.id ?? null);
                res.status(201).json(result);
            } catch (err) {
                res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
            }
        });

        this.managementRouter.delete('/keys/:id', requirePermission(ZoePermission.MANAGE_KEYS), async (req: Request, res: Response) => {
            try {
                res.status(200).json(await this.zoeKeyService.revoke(req.params.id, req.user?.id ?? null));
            } catch (err) {
                res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
            }
        });

        // ── Config management (prompt + model) ────────────────────────────────

        this.managementRouter.get('/config', requirePermission(ZoePermission.MANAGE_CONFIG), async (_req: Request, res: Response) => {
            try {
                res.status(200).json(await this.zoeConfigDAO.getAll());
            } catch (err) {
                res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
            }
        });

        this.managementRouter.patch('/config/:key', requirePermission(ZoePermission.MANAGE_CONFIG), async (req: Request, res: Response) => {
            const { value } = req.body as { value?: string };
            if (!value?.trim()) {
                return res.status(400).json({ error: 'value is required' });
            }
            try {
                res.status(200).json(await this.zoeConfigDAO.setValue(req.params.key, value.trim(), req.user?.id ?? null));
            } catch (err) {
                res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
            }
        });
    }

    /** Session-authed management routes: /api/zoe */
    public routes(): Router {
        return this.managementRouter;
    }

    /** Zoe Bearer-token route: /api/zoe-ask */
    public externalRoutes(): Router {
        return this.externalRouter;
    }
}
