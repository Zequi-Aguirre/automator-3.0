// resources/campaignResource.ts
import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import CampaignService from "../services/campaignService.ts";

@injectable()
export default class CampaignResource {
    private readonly router: Router;

    constructor(private readonly campaignService: CampaignService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/admin/get-all", async (_req: Request, res: Response) => {
            const campaigns = await this.campaignService.getAll();
            res.status(200).send(campaigns);
        });

        this.router.patch("/admin/update-meta/:campaignId", async (req: Request, res: Response) => {
            const { campaignId } = req.params;
            const updates = req.body; // expects { rating, blacklisted }
            const updated = await this.campaignService.updateCampaignMeta(campaignId, updates);
            res.status(200).send(updated);
        });
    }

    public routes(): Router {
        return this.router;
    }
}