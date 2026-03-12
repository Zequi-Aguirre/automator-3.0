import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadManagerService from '../services/leadManagerService';

@injectable()
export default class LeadManagerResource {
    private readonly router: Router;

    constructor(private readonly leadManagerService: LeadManagerService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/lead-managers — list with pagination
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 100,
                    search: req.query.search as string | undefined,
                    includeInactive: req.query.includeInactive === 'true'
                };
                const result = await this.leadManagerService.getAll(filters);
                res.status(200).json(result);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // GET /api/lead-managers/active — active managers for dropdowns
        this.router.get('/active', async (_req: Request, res: Response) => {
            try {
                const items = await this.leadManagerService.getActive();
                res.status(200).json(items);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // GET /api/lead-managers/:id
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const manager = await this.leadManagerService.getById(req.params.id);
                if (!manager) return res.status(404).json({ error: 'Lead manager not found' });
                res.status(200).json(manager);
            } catch (error) {
                res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // POST /api/lead-managers
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const { name, email, phone, notes } = req.body;
                const manager = await this.leadManagerService.create({ name, email, phone, notes });
                res.status(201).json(manager);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('required') ? 400 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // PUT /api/lead-managers/:id
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const { name, email, phone, active, notes } = req.body;
                const manager = await this.leadManagerService.update(req.params.id, { name, email, phone, active, notes });
                res.status(200).json(manager);
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // DELETE /api/lead-managers/:id
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                await this.leadManagerService.trash(req.params.id);
                res.status(204).send();
            } catch (error) {
                const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
                res.status(status).json({ error: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
