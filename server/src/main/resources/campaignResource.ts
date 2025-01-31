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
        this.router.post("/admin/create", async (req: Request, res: Response) => {
            const createdCampaign = await this.campaignService.createOne(req.body);
            res.status(201).send(createdCampaign);
        });

        this.router.get("/admin/get-all", async (_req: Request, res: Response) => {
            const campaigns = await this.campaignService.getAll();
            res.status(200).send(campaigns);
        });

        this.router.get("/admin/get-active", async (_req: Request, res: Response) => {
            const campaigns = await this.campaignService.getActive();
            res.status(200).send(campaigns);
        });

        this.router.get("/admin/get/:campaignId", async (req: Request, res: Response) => {
            const { campaignId } = req.params;
            const campaign = await this.campaignService.getById(campaignId);
            res.status(200).send(campaign);
        });

        this.router.patch("/admin/update/:campaignId", async (req: Request, res: Response) => {
            const { campaignId } = req.params;
            const updatedCampaign = await this.campaignService.updateCampaign(campaignId, req.body);
            res.status(200).send(updatedCampaign);
        });

        this.router.patch("/admin/update-status/:campaignId", async (req: Request, res: Response) => {
            const { campaignId } = req.params;
            const { status } = req.body;
            const updatedCampaign = await this.campaignService.updateCampaignStatus(campaignId, status);
            res.status(200).send(updatedCampaign);
        });

        this.router.delete("/admin/delete/:campaignId", async (req: Request, res: Response) => {
            const { campaignId } = req.params;
            await this.campaignService.deleteCampaign(campaignId);
            res.status(200).send();
        });
    }

    public routes(): Router {
        return this.router;
    }
}