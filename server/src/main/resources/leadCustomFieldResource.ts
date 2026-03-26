// TICKET-152: Lead Custom Fields Resource
import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import LeadCustomFieldService from '../services/leadCustomFieldService';
import { requirePermission } from '../middleware/requirePermission';
import { LeadCustomFieldPermission } from '../types/permissionTypes';

@injectable()
export default class LeadCustomFieldResource {
    private readonly router: Router;

    constructor(private readonly leadCustomFieldService: LeadCustomFieldService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/lead-custom-fields — all fields including inactive (manage permission)
        this.router.get('/', requirePermission(LeadCustomFieldPermission.MANAGE), async (_req: Request, res: Response) => {
            try {
                const fields = await this.leadCustomFieldService.getAll();
                res.status(200).json(fields);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // GET /api/lead-custom-fields/active — active fields only (any authenticated user — used by form renderer)
        this.router.get('/active', async (_req: Request, res: Response) => {
            try {
                const fields = await this.leadCustomFieldService.getAllActive();
                res.status(200).json(fields);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // GET /api/lead-custom-fields/auto-discovered-count — badge count for admin UI
        this.router.get('/auto-discovered-count', requirePermission(LeadCustomFieldPermission.MANAGE), async (_req: Request, res: Response) => {
            try {
                const count = await this.leadCustomFieldService.getAutoDiscoveredCount();
                res.status(200).json({ count });
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // POST /api/lead-custom-fields — create a new field
        this.router.post('/', requirePermission(LeadCustomFieldPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const field = await this.leadCustomFieldService.create(req.body, req.user?.id);
                res.status(201).json(field);
            } catch (error) {
                const isClientError = error instanceof Error && (
                    error.message.includes('required') ||
                    error.message.includes('already exists') ||
                    error.message.includes('snake_case')
                );
                const status = isClientError ? 400 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/lead-custom-fields/:id — update label, type, options, required, sort_order
        this.router.patch('/:id', requirePermission(LeadCustomFieldPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const field = await this.leadCustomFieldService.update(req.params.id, req.body, req.user?.id);
                res.status(200).json(field);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('empty') ? 400 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PATCH /api/lead-custom-fields/:id/active — activate or deactivate
        this.router.patch('/:id/active', requirePermission(LeadCustomFieldPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { active } = req.body;
                if (typeof active !== 'boolean') {
                    return res.status(400).json({ error: 'active must be a boolean' });
                }
                const field = await this.leadCustomFieldService.setActive(req.params.id, active, req.user?.id);
                res.status(200).json(field);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
