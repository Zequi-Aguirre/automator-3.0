import express, { Request, Response, Router } from 'express';
import { injectable } from 'tsyringe';
import multer from 'multer';
import ReconciliationImportService from '../services/reconciliationImportService';
import ActivityService from '../services/activityService';
import { requirePermission } from '../middleware/requirePermission';
import { ReconciliationPermission } from '../types/permissionTypes';
import { ReconciliationAction } from '../types/activityTypes';
import { ConfirmImportDTO, Platform } from '../types/reconciliationTypes';

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

        // POST /api/reconciliation/import/preview
        // Parse file and return detected platform buyers. Does not insert anything.
        this.router.post(
            '/import/preview',
            requirePermission(ReconciliationPermission.MANAGE),
            upload.single('file'),
            async (req: Request, res: Response) => {
                try {
                    if (!req.file) {
                        return res.status(400).send({ message: 'No file uploaded' });
                    }

                    const platform = req.body.platform as Platform;
                    if (!platform) {
                        return res.status(400).send({ message: 'platform is required' });
                    }

                    const result = await this.importService.previewFile(
                        platform,
                        req.file.buffer,
                        req.file.originalname
                    );

                    return res.status(200).send(result);
                } catch (error) {
                    console.error('Reconciliation preview error:', error);
                    return res.status(500).send({
                        message: 'Failed to preview file',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        );

        // POST /api/reconciliation/import/confirm
        // Apply buyer mappings and insert records.
        this.router.post(
            '/import/confirm',
            requirePermission(ReconciliationPermission.MANAGE),
            async (req: Request, res: Response) => {
                try {
                    const { platform, file_token, buyer_mappings } = req.body as ConfirmImportDTO;

                    if (!file_token) {
                        return res.status(400).send({ message: 'file_token is required' });
                    }
                    if (!buyer_mappings || !Array.isArray(buyer_mappings)) {
                        return res.status(400).send({ message: 'buyer_mappings must be an array' });
                    }

                    const result = await this.importService.confirmImport(
                        file_token,
                        buyer_mappings,
                        req.user!.id
                    );

                    await this.activityService.log({
                        user_id: req.user?.id,
                        action: ReconciliationAction.IMPORTED,
                        action_details: {
                            platform,
                            batch_id: result.batch_id,
                            row_count: result.row_count,
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
        // Last import batch per platform — used to show "last imported" in UI.
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
