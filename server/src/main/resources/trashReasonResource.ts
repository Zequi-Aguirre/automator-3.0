import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import TrashReasonService from '../services/trashReasonService';
import { requirePermission } from '../middleware/requirePermission';
import { TrashReasonPermission } from '../types/permissionTypes';

@injectable()
export default class TrashReasonResource {
    private readonly router: Router;

    constructor(private readonly trashReasonService: TrashReasonService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/trash-reasons — active only (all authenticated users)
        this.router.get('/', async (_req: Request, res: Response) => {
            try {
                const reasons = await this.trashReasonService.getActive();
                res.status(200).json(reasons);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // GET /api/trash-reasons/all — all including inactive (manage permission)
        this.router.get('/all', requirePermission(TrashReasonPermission.MANAGE), async (_req: Request, res: Response) => {
            try {
                const reasons = await this.trashReasonService.getAll();
                res.status(200).json(reasons);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // POST /api/trash-reasons — create new reason
        this.router.post('/', requirePermission(TrashReasonPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { label, sort_order } = req.body;
                const reason = await this.trashReasonService.create({ label, sort_order }, req.user?.id);
                res.status(201).json(reason);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('required') ? 400 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/trash-reasons/:id/active — activate or deactivate
        this.router.patch('/:id/active', requirePermission(TrashReasonPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { active } = req.body;
                if (typeof active !== 'boolean') {
                    return res.status(400).json({ error: 'active must be a boolean' });
                }
                const reason = await this.trashReasonService.setActive(req.params.id, active, req.user?.id);
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
