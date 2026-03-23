import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import multer from 'multer';
import ReconciliationImportService from '../services/reconciliationImportService';
import ReconciliationMatchingService from '../services/reconciliationMatchingService';
import PlatformLeadRecordDAO from '../data/platformLeadRecordDAO';
import ActivityService from '../services/activityService';
import { requirePermission } from '../middleware/requirePermission';
import { ReconciliationPermission } from '../types/permissionTypes';
import { ReconciliationAction } from '../types/activityTypes';

const upload = multer();

@injectable()
export default class ReconciliationResource {
    private readonly router: Router;

    constructor(
        private readonly importService: ReconciliationImportService,
        private readonly matchingService: ReconciliationMatchingService,
        private readonly recordDAO: PlatformLeadRecordDAO,
        private readonly activityService: ActivityService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {

        // POST /api/reconciliation/import
        // Multipart form: automator_buyer_id (field) + file (field)
        this.router.post(
            '/import',
            requirePermission(ReconciliationPermission.MANAGE),
            upload.single('file'),
            async (req: Request, res: Response) => {
                try {
                    if (!req.file) {
                        return res.status(400).send({ message: 'No file uploaded' });
                    }

                    const { automator_buyer_id } = req.body;
                    if (!automator_buyer_id) {
                        return res.status(400).send({ message: 'automator_buyer_id is required' });
                    }

                    const result = await this.importService.importFile(
                        req.file.buffer,
                        req.file.originalname,
                        automator_buyer_id,
                        req.user!.id
                    );

                    await this.activityService.log({
                        user_id: req.user?.id,
                        action: ReconciliationAction.IMPORTED,
                        action_details: {
                            batch_id: result.batch_id,
                            row_count: result.row_count,
                            automator_buyer_id,
                        },
                    });

                    return res.status(200).send(result);
                } catch (error) {
                    console.error('Reconciliation import error:', error);
                    return res.status(500).send({
                        message: 'Failed to import file',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        );

        // GET /api/reconciliation/batches
        this.router.get(
            '/batches',
            requirePermission(ReconciliationPermission.VIEW),
            async (_req: Request, res: Response) => {
                try {
                    const batches = await this.importService.getLastBatchesPerPlatform();
                    return res.status(200).send(batches);
                } catch (error) {
                    console.error('Error fetching reconciliation batches:', error);
                    return res.status(500).send({
                        message: 'Failed to fetch batches',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        );

        // GET /api/reconciliation/records?platform=&match_status=&automator_buyer_id=&disputed=&page=&limit=
        this.router.get(
            '/records',
            requirePermission(ReconciliationPermission.VIEW),
            async (req: Request, res: Response) => {
                try {
                    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
                    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10)));
                    const result = await this.recordDAO.getRecords({
                        platform: req.query.platform as string | undefined,
                        match_status: req.query.match_status as string | undefined,
                        automator_buyer_id: req.query.automator_buyer_id as string | undefined,
                        disputed: req.query.disputed === 'true' ? true : undefined,
                        page,
                        limit,
                    });
                    return res.status(200).json(result);
                } catch (error) {
                    console.error('Error fetching reconciliation records:', error);
                    return res.status(500).json({ message: 'Failed to fetch records' });
                }
            }
        );

        // POST /api/reconciliation/match
        // Re-run matching engine. Optional body: { batch_id: number }
        this.router.post(
            '/match',
            requirePermission(ReconciliationPermission.MANAGE),
            async (req: Request, res: Response) => {
                try {
                    const batchId: string | undefined = req.body?.batch_id ?? undefined;
                    const stats = await this.matchingService.runMatching(batchId, req.user?.id);
                    return res.status(200).send(stats);
                } catch (error) {
                    console.error('Reconciliation matching error:', error);
                    return res.status(500).send({
                        message: 'Failed to run matching engine',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        );
    }

    public routes(): Router {
        return this.router;
    }
}
