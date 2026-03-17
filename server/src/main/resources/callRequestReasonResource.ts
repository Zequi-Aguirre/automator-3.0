import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import CallRequestReasonService from '../services/callRequestReasonService';
import { requirePermission } from '../middleware/requirePermission';
import { CallRequestReasonPermission } from '../types/permissionTypes';

@injectable()
export default class CallRequestReasonResource {
    private readonly router: Router;

    constructor(private readonly callRequestReasonService: CallRequestReasonService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/call-request-reasons — active only (all authenticated users)
        this.router.get('/', async (_req: Request, res: Response) => {
            try {
                const reasons = await this.callRequestReasonService.getActive();
                res.status(200).json(reasons);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // GET /api/call-request-reasons/all — all including inactive (manage permission)
        this.router.get('/all', requirePermission(CallRequestReasonPermission.MANAGE), async (_req: Request, res: Response) => {
            try {
                const reasons = await this.callRequestReasonService.getAll();
                res.status(200).json(reasons);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // POST /api/call-request-reasons — create new reason
        this.router.post('/', requirePermission(CallRequestReasonPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { label, sort_order } = req.body;
                const reason = await this.callRequestReasonService.create({ label, sort_order }, req.user?.id);
                res.status(201).json(reason);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('required') ? 400 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/call-request-reasons/:id/active — activate or deactivate
        this.router.patch('/:id/active', requirePermission(CallRequestReasonPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { active } = req.body;
                if (typeof active !== 'boolean') {
                    return res.status(400).json({ error: 'active must be a boolean' });
                }
                const reason = await this.callRequestReasonService.setActive(req.params.id, active, req.user?.id);
                res.status(200).json(reason);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/call-request-reasons/:id/comment-required — toggle comment required
        this.router.patch('/:id/comment-required', requirePermission(CallRequestReasonPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { comment_required } = req.body;
                if (typeof comment_required !== 'boolean') {
                    return res.status(400).json({ error: 'comment_required must be a boolean' });
                }
                const reason = await this.callRequestReasonService.setCommentRequired(req.params.id, comment_required, req.user?.id);
                res.status(200).json(reason);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
