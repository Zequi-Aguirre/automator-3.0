import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import ActivityService from '../services/activityService';
import { requirePermission } from '../middleware/requirePermission';
import { ActivityPermission } from '../types/permissionTypes';

@injectable()
export default class ActivityResource {
    private readonly router: Router;

    constructor(private readonly activityService: ActivityService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/recent', requirePermission(ActivityPermission.VIEW), async (_req: Request, res: Response) => {
            try {
                const logs = await this.activityService.getRecent();
                return res.status(200).send({ logs });
            } catch (err) {
                return res.status(500).send({ message: 'Failed to fetch activity' });
            }
        });

        this.router.get('/stats', requirePermission(ActivityPermission.VIEW), async (req: Request, res: Response) => {
            try {
                const days = req.query.days ? Number(req.query.days) : undefined;
                const stats = await this.activityService.getUserStats(days);
                return res.status(200).send({ stats });
            } catch (err) {
                return res.status(500).send({ message: 'Failed to fetch stats' });
            }
        });

        this.router.get('/lead/:leadId', requirePermission(ActivityPermission.VIEW), async (req: Request, res: Response) => {
            try {
                const logs = await this.activityService.getByLead(req.params.leadId);
                return res.status(200).send({ logs });
            } catch (err) {
                return res.status(500).send({ message: 'Failed to fetch lead activity' });
            }
        });

        this.router.get('/user/:userId', requirePermission(ActivityPermission.VIEW), async (req: Request, res: Response) => {
            try {
                const logs = await this.activityService.getByUser(req.params.userId);
                return res.status(200).send({ logs });
            } catch (err) {
                return res.status(500).send({ message: 'Failed to fetch user activity' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
