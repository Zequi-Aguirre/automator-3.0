// resources/affiliateResource.ts
import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import AffiliateService from "../services/affiliateService.ts";

@injectable()
export default class AffiliateResource {
    private readonly router: Router;

    constructor(private readonly affiliateService: AffiliateService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/admin/get-all", async (_req: Request, res: Response) => {
            const affiliates = await this.affiliateService.getAll();
            res.status(200).send(affiliates);
        });

        this.router.patch("/admin/update-meta/:affiliateId", async (req: Request, res: Response) => {
            const { affiliateId } = req.params;
            const updates = req.body; // expects { rating, blacklisted }
            const updated = await this.affiliateService.updateAffiliateMeta(affiliateId, updates);
            res.status(200).send(updated);
        });
    }

    public routes(): Router {
        return this.router;
    }
}