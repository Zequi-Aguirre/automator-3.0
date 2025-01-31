import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';

@injectable()
export default class LeadPingPostResource {
    private readonly router: Router;

    constructor(private readonly leadService: LeadService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Ping a lead
        this.router.post("/ping", async (req: Request, res: Response) => {
            // TODO check for campaign_key if not reject sometimes. figure it out. lol
            const leadData = {
                address: req.body.address,
                city: req.body.city,
                state: req.body.state,
                zipcode: req.body.zipcode,
            };
            const response = await this.leadService.pingLead(req.body.campaign_key, leadData);
            res.status(200).send(response);
        });

        // Post a lead
        this.router.post("/post/:ping_id", async (req: Request, res: Response) => {
            const pingId = req.params.ping_id;
            try {
                const contactData = {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    phone: req.body.phone,
                    email: req.body.email
                };

                const response = await this.leadService.postLead(pingId, contactData);
                res.status(200).send(response);
            } catch (error) {
                res.status(400).send({
                    message: "Failed to post lead",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}