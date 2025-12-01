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
        this.router.get('/admin/get-many', async (req: Request, res: Response) => {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;

            const data = await this.affiliateService.getMany({ page, limit });
            res.status(200).send(data);
        });

        this.router.patch("/admin/update-meta/:affiliateId", async (req: Request, res: Response) => {
            const { affiliateId } = req.params;
            const updates = req.body; // expects { rating, blacklisted }
            const updated = await this.affiliateService.updateAffiliateMeta(affiliateId, updates);
            res.status(200).send(updated);
        });

        this.router.get("/admin/:affiliateId", async (req: Request, res: Response) => {
            const { affiliateId } = req.params;
            const affiliate = await this.affiliateService.getById(affiliateId);
            if (!affiliate) {
                return res.status(404).send({ error: "Affiliate not found" });
            }
            res.status(200).send(affiliate);
        });
    }

    public routes(): Router {
        return this.router;
    }
}