import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import multer from 'multer';
import ReconciliationImportService from '../services/reconciliationImportService';
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
    }

    public routes(): Router {
        return this.router;
    }
}
