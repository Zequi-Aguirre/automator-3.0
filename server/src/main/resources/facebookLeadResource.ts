// TICKET-143: Facebook leads admin API (authenticated)
import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import FacebookLeadService from '../services/facebookLeadService';
import FacebookLeadRecordDAO from '../data/facebookLeadRecordDAO';
import { requirePermission } from '../middleware/requirePermission';
import { FacebookPermission } from '../types/permissionTypes';

@injectable()
export default class FacebookLeadResource {
    private readonly router: Router;

    constructor(
        private readonly facebookLeadService: FacebookLeadService,
        private readonly recordDAO: FacebookLeadRecordDAO,
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/facebook/leads?source_id=&match_status=&fb_form_id=&page=&limit=
        this.router.get('/leads', requirePermission(FacebookPermission.VIEW), async (req: Request, res: Response) => {
            try {
                const page  = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
                const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10)));
                const result = await this.recordDAO.getRecords({
                    source_id:    req.query.source_id as string | undefined,
                    match_status: req.query.match_status as string | undefined,
                    fb_form_id:   req.query.fb_form_id as string | undefined,
                    page,
                    limit,
                });
                return res.status(200).json(result);
            } catch (err) {
                return res.status(500).json({ message: 'Failed to fetch Facebook leads' });
            }
        });

        // POST /api/facebook/sync/:sourceId — trigger historical pull for one source
        this.router.post('/sync/:sourceId', requirePermission(FacebookPermission.SYNC), async (req: Request, res: Response) => {
            try {
                const result = await this.facebookLeadService.pullHistoricalLeads(req.params.sourceId);
                return res.status(200).json(result);
            } catch (err) {
                console.error('[FacebookLeadResource] Historical pull error:', err);
                return res.status(500).json({ message: err instanceof Error ? err.message : 'Sync failed' });
            }
        });

        // POST /api/facebook/match — re-run matching on all pending records
        this.router.post('/match', requirePermission(FacebookPermission.SYNC), async (_req: Request, res: Response) => {
            try {
                const result = await this.facebookLeadService.runMatching();
                return res.status(200).json(result);
            } catch (err) {
                return res.status(500).json({ message: 'Matching failed' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
