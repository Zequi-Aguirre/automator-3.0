import express, { Request, Response, Router } from "express";
import { injectable } from "tsyringe";
import SendLogService from "../services/sendLogService.ts";

@injectable()
export default class SendLogResource {
    private readonly router: Router;

    constructor(private readonly sendLogService: SendLogService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/admin/get-many", async (req: Request, res: Response) => {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;

            const status = req.query.status ? String(req.query.status) : undefined;
            const affiliate_id = req.query.affiliate_id ? String(req.query.affiliate_id) : undefined;
            const campaign_id = req.query.campaign_id ? String(req.query.campaign_id) : undefined;
            const county_id = req.query.county_id ? String(req.query.county_id) : undefined;

            const data = await this.sendLogService.getMany({
                page,
                limit,
                status,
                affiliate_id,
                campaign_id,
                county_id,
            });

            res.status(200).send(data);
        });

        this.router.patch("/admin/update/:logId", async (req: Request, res: Response) => {
            const { logId } = req.params;
            const updates = req.body;
            const updated = await this.sendLogService.updateLog(logId, updates);
            res.status(200).send(updated);
        });
    }

    public routes(): Router {
        return this.router;
    }
}