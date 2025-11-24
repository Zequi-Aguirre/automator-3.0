import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';

@injectable()
export default class LeadResource {
    private readonly router: Router;

    constructor(private readonly leadService: LeadService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Get many leads with pagination and oldDatabase support
        this.router.get("/admin/get-many", async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 10,
                    search: req.query.search ? String(req.query.search) : "",
                    status: req.query.status ? String(req.query.status) as any : 'new'
                };

                const result = await this.leadService.getMany(filters);
                return res.status(200).send(result);
            } catch (error) {
                console.error('Error in get-many:', error);
                return res.status(500).send({
                    message: 'Failed to fetch leads',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        this.router.get("/user/get-many", async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 10,
                    search: req.query.search ? String(req.query.search) : "",
                    status: req.query.status ? String(req.query.status) as any : 'new'
                };

                const result = await this.leadService.getMany(filters);
                return res.status(200).send(result);
            } catch (error) {
                console.error('Error in get-many:', error);
                return res.status(500).send({
                    message: 'Failed to fetch leads',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Get single lead by ID with oldDatabase support
        this.router.get("/get/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const lead = await this.leadService.getLeadById(leadId);

                if (!lead) {
                    return res.status(404).send({ message: 'Lead not found' });
                }

                return res.status(200).send(lead);
            } catch (error) {
                console.error('Error fetching lead:', error);
                return res.status(500).send({
                    message: 'Failed to fetch lead',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Update lead with oldDatabase support
        this.router.patch("/update/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const leadData = req.body;
                const lead = await this.leadService.updateLead(leadId, leadData);
                return res.status(200).send(lead);
            } catch (error) {
                console.error('Error updating lead:', error);
                return res.status(500).send({
                    message: 'Failed to update lead',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Send lead with oldDatabase support
        this.router.patch("/admin/send/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const userId = req.user.id; // Assuming user is attached to request by auth middleware
                const response = `${leadId} - ${userId}` // await this.leadService.sendLeadWithDelay(leadId, userId);
                return res.status(200).send(response);
            } catch (error) {
                console.error('Error sending lead:', error);
                return res.status(500).send({
                    message: 'Failed to send lead',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Verify lead
        this.router.patch("/verify/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const result = await this.leadService.verifyLead(leadId);
                return res.status(200).send(result);
            } catch (error) {
                return res.status(400).send({ message: error instanceof Error ? error.message : "Verification failed" });
            }
        });

        // Unverify lead
        this.router.patch("/unverify/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const result = await this.leadService.unverifyLead(leadId);
                return res.status(200).send(result);
            } catch (error) {
                return res.status(400).send({ message: error instanceof Error ? error.message : "Unverify failed" });
            }
        });

        // Trash lead with oldDatabase support
        this.router.patch("/trash/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const response = await this.leadService.trashLead(leadId);
                return res.status(200).send(response);
            } catch (error) {
                console.error('Error trashing lead:', error);
                return res.status(500).send({
                    message: 'Failed to trash lead',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}