import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import InvestorService from "../services/investorService.ts";

@injectable()
export default class InvestorResource {
    private readonly router: Router;

    constructor(private readonly investorService: InvestorService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/admin/get-many', async (req: Request, res: Response) => {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;

            const data = await this.investorService.getMany({ page, limit });
            res.status(200).send(data);
        });

        this.router.patch("/admin/update-meta/:affiliateId", async (req: Request, res: Response) => {
            const { affiliateId } = req.params;
            const updates = req.body; // expects { rating, blacklisted }
            const updated = await this.investorService.updateInvestorMeta(affiliateId, updates);
            res.status(200).send(updated);
        });

        this.router.get("/admin/:affiliateId", async (req: Request, res: Response) => {
            const { affiliateId } = req.params;
            const affiliate = await this.investorService.getById(affiliateId);
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