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
        this.router.get("/admin/get-many", async (req: Request, res: Response) => {
            const filters = {
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 10,
            };
            const result = await this.campaignService.getMany(filters);
            res.status(200).send(result);
        });

        this.router.get("/admin/get-by-affiliate/:affiliateId", async (req: Request, res: Response) => {
            const { affiliateId } = req.params;
            const result = await this.campaignService.getByAffiliateId(affiliateId);
            res.status(200).send(result);
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