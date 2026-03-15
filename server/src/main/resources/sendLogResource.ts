import express, { Request, Response, Router } from "express";
import { injectable } from "tsyringe";
import SendLogService from "../services/sendLogService.ts";
import { requirePermission } from "../middleware/requirePermission.ts";
import { DisputePermission, LogPermission, LeadPermission } from "../types/permissionTypes.ts";

@injectable()
export default class SendLogResource {
    private readonly router: Router;

    constructor(private readonly sendLogService: SendLogService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/admin/get-many", requirePermission(LogPermission.VIEW), async (req: Request, res: Response) => {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;

            const status = req.query.status ? String(req.query.status) : undefined;
            const source_id = req.query.source_id ? String(req.query.source_id) : undefined;
            const campaign_id = req.query.campaign_id ? String(req.query.campaign_id) : undefined;
            const county_id = req.query.county_id ? String(req.query.county_id) : undefined;

            const data = await this.sendLogService.getMany({
                page,
                limit,
                status,
                source_id,
                campaign_id,
                county_id,
            });

            res.status(200).send(data);
        });

        this.router.patch("/admin/update/:logId", requirePermission(LeadPermission.SEND), async (req: Request, res: Response) => {
            const { logId } = req.params;
            const updates = req.body;
            const updated = await this.sendLogService.updateLog(logId, updates);
            res.status(200).send(updated);
        });

        this.router.patch("/:logId/dispute", requirePermission(DisputePermission.CREATE), async (req: Request, res: Response) => {
            try {
                const { logId } = req.params;
                const { reason, buyer_name } = req.body;
                if (!reason || String(reason).trim().length === 0) {
                    return res.status(400).send({ message: 'reason is required' });
                }
                const buyerName = buyer_name ? String(buyer_name).trim() : null;
                const log = await this.sendLogService.disputeLog(logId, String(reason).trim(), buyerName, req.user?.id ?? null);
                return res.status(200).send(log);
            } catch (error) {
                return res.status(500).send({ message: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        this.router.patch("/:logId/undispute", requirePermission(DisputePermission.CREATE), async (req: Request, res: Response) => {
            try {
                const { logId } = req.params;
                const log = await this.sendLogService.undisputeLog(logId, req.user?.id ?? null);
                return res.status(200).send(log);
            } catch (error) {
                return res.status(500).send({ message: error instanceof Error ? error.message : 'Unknown error' });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}