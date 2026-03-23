import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import PlatformConnectionService from '../services/platformConnectionService';
import ActivityService from '../services/activityService';
import { requirePermission } from '../middleware/requirePermission';
import { PlatformConnectionPermission } from '../types/permissionTypes';
import { PlatformConnectionAction } from '../types/activityTypes';
import { PlatformConnectionCreateDTO, PlatformConnectionUpdateDTO } from '../types/platformConnectionTypes';

@injectable()
export default class PlatformConnectionResource {
    private readonly router: Router;

    constructor(
        private readonly service: PlatformConnectionService,
        private readonly activityService: ActivityService,
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/platform-connections
        this.router.get('/', requirePermission(PlatformConnectionPermission.MANAGE), async (_req: Request, res: Response) => {
            try {
                const connections = await this.service.getAll();
                return res.status(200).json(connections);
            } catch (err) {
                return res.status(500).json({ message: 'Failed to fetch platform connections' });
            }
        });

        // GET /api/platform-connections/:id
        this.router.get('/:id', requirePermission(PlatformConnectionPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const conn = await this.service.getById(req.params.id);
                if (!conn) return res.status(404).json({ message: 'Not found' });
                return res.status(200).json(conn);
            } catch (err) {
                return res.status(500).json({ message: 'Failed to fetch platform connection' });
            }
        });

        // POST /api/platform-connections
        this.router.post('/', requirePermission(PlatformConnectionPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const dto = req.body as PlatformConnectionCreateDTO;
                if (!dto.host || !dto.dbname || !dto.db_username || !dto.password) {
                    return res.status(400).json({ message: 'host, dbname, db_username, and password are required' });
                }
                const conn = await this.service.create(dto);
                await this.activityService.log({
                    user_id: req.user?.id,
                    action: PlatformConnectionAction.CREATED,
                    action_details: { connection_id: conn.id, host: conn.host },
                });
                return res.status(201).json(conn);
            } catch (err) {
                console.error('Error creating platform connection:', err);
                return res.status(500).json({ message: err instanceof Error ? err.message : 'Failed to create platform connection' });
            }
        });

        // PATCH /api/platform-connections/:id
        this.router.patch('/:id', requirePermission(PlatformConnectionPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const dto = req.body as PlatformConnectionUpdateDTO;
                const conn = await this.service.update(req.params.id, dto);
                await this.activityService.log({
                    user_id: req.user?.id,
                    action: PlatformConnectionAction.UPDATED,
                    action_details: { connection_id: conn.id },
                });
                return res.status(200).json(conn);
            } catch (err) {
                console.error('Error updating platform connection:', err);
                return res.status(500).json({ message: 'Failed to update platform connection' });
            }
        });

        // DELETE /api/platform-connections/:id
        this.router.delete('/:id', requirePermission(PlatformConnectionPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const conn = await this.service.delete(req.params.id);
                await this.activityService.log({
                    user_id: req.user?.id,
                    action: PlatformConnectionAction.DELETED,
                    action_details: { connection_id: conn.id },
                });
                return res.status(200).json(conn);
            } catch (err) {
                return res.status(500).json({ message: 'Failed to delete platform connection' });
            }
        });

        // POST /api/platform-connections/:id/test
        this.router.post('/:id/test', requirePermission(PlatformConnectionPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const result = await this.service.testConnection(req.params.id);
                return res.status(200).json(result);
            } catch (err) {
                return res.status(500).json({ ok: false, message: 'Test failed unexpectedly' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
