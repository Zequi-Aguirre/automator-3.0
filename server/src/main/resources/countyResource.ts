// resources/countyResource.ts
import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import CountyService from "../services/countyService.ts";

@injectable()
export default class CountyResource {
    private readonly router: Router;

    constructor(private readonly countyService: CountyService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/admin/get-all", async (_req: Request, res: Response) => {
            const counties = await this.countyService.getAll();
            res.status(200).send(counties);
        });

        this.router.get("/admin/get-many", async (req: Request, res: Response) => {
            const filters = {
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 100
            };

            const result = await this.countyService.getMany(filters);
            res.status(200).send(result);
        });

        this.router.patch("/admin/blacklist/:countyId", async (req: Request, res: Response) => {
            const { countyId } = req.params;
            const { blacklisted } = req.body;
            const updated = await this.countyService.updateCountyBlacklistStatus(countyId, blacklisted);
            res.status(200).send(updated);
        });
    }

    public routes(): Router {
        return this.router;
    }
}