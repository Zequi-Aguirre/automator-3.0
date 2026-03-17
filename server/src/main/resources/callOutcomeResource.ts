import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import CallOutcomeService from '../services/callOutcomeService';
import { requirePermission } from '../middleware/requirePermission';
import { CallOutcomePermission } from '../types/permissionTypes';

@injectable()
export default class CallOutcomeResource {
    private readonly router: Router;

    constructor(private readonly callOutcomeService: CallOutcomeService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/call-outcomes — active only (all authenticated users)
        this.router.get('/', async (_req: Request, res: Response) => {
            try {
                const outcomes = await this.callOutcomeService.getActive();
                res.status(200).json(outcomes);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // GET /api/call-outcomes/all — all including inactive (manage permission)
        this.router.get('/all', requirePermission(CallOutcomePermission.MANAGE), async (_req: Request, res: Response) => {
            try {
                const outcomes = await this.callOutcomeService.getAll();
                res.status(200).json(outcomes);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // POST /api/call-outcomes — create new outcome
        this.router.post('/', requirePermission(CallOutcomePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { label, sort_order } = req.body;
                const outcome = await this.callOutcomeService.create({ label, sort_order }, req.user?.id);
                res.status(201).json(outcome);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('required') ? 400 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/call-outcomes/:id/active — activate or deactivate
        this.router.patch('/:id/active', requirePermission(CallOutcomePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { active } = req.body;
                if (typeof active !== 'boolean') {
                    return res.status(400).json({ error: 'active must be a boolean' });
                }
                const outcome = await this.callOutcomeService.setActive(req.params.id, active, req.user?.id);
                res.status(200).json(outcome);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/call-outcomes/:id/comment-required — toggle comment required
        this.router.patch('/:id/comment-required', requirePermission(CallOutcomePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { comment_required } = req.body;
                if (typeof comment_required !== 'boolean') {
                    return res.status(400).json({ error: 'comment_required must be a boolean' });
                }
                const outcome = await this.callOutcomeService.setCommentRequired(req.params.id, comment_required, req.user?.id);
                res.status(200).json(outcome);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/call-outcomes/:id/resolves-call — toggle resolves_call
        this.router.patch('/:id/resolves-call', requirePermission(CallOutcomePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { resolves_call } = req.body;
                if (typeof resolves_call !== 'boolean') {
                    return res.status(400).json({ error: 'resolves_call must be a boolean' });
                }
                const outcome = await this.callOutcomeService.setResolvesCall(req.params.id, resolves_call, req.user?.id);
                res.status(200).json(outcome);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // DELETE /api/call-outcomes/:id — permanently delete an outcome
        this.router.delete('/:id', requirePermission(CallOutcomePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const outcome = await this.callOutcomeService.delete(req.params.id, req.user?.id);
                res.status(200).json(outcome);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
