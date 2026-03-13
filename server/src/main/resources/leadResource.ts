import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';
import { requirePermission } from '../middleware/requirePermission';
import { LeadPermission } from '../types/permissionTypes';
import { LeadFilters } from '../types/leadTypes';

@injectable()
export default class LeadResource {
    private readonly router: Router;

    constructor(private readonly leadService: LeadService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Get many leads with pagination and oldDatabase support
        this.router.get("/get-many", async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 10,
                    search: req.query.search ? String(req.query.search) : "",
                    status: req.query.status ? String(req.query.status) as LeadFilters['status'] : 'new'
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
                const lead = await this.leadService.updateLead(leadId, leadData, req.user?.id);
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
        this.router.patch("/verify/:leadId", requirePermission(LeadPermission.VERIFY), async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const result = await this.leadService.verifyLead(leadId, req.user?.id);
                return res.status(200).send(result);
            } catch (error) {
                return res.status(400).send({ message: error instanceof Error ? error.message : "Verification failed" });
            }
        });

        // Unverify lead
        this.router.patch("/unverify/:leadId", requirePermission(LeadPermission.VERIFY), async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const result = await this.leadService.unverifyLead(leadId, req.user?.id);
                return res.status(200).send(result);
            } catch (error) {
                return res.status(400).send({ message: error instanceof Error ? error.message : "Unverify failed" });
            }
        });

        // Trash lead with oldDatabase support
        this.router.patch("/trash/:leadId", requirePermission(LeadPermission.TRASH), async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const notes = req.body?.notes ?? null;
                const response = await this.leadService.trashLead(leadId, "MANUAL_USER_DELETE", req.user?.id, notes);
                return res.status(200).send(response);
            } catch (error) {
                console.error('Error trashing lead:', error);
                return res.status(500).send({
                    message: 'Failed to trash lead',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Untrash lead
        this.router.patch("/untrash/:leadId", requirePermission(LeadPermission.UNTRASH), async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const response = await this.leadService.untrashLead(leadId, req.user?.id);
                return res.status(200).send(response);
            } catch (error) {
                console.error('Error untrashing lead:', error);
                return res.status(500).send({
                    message: 'Failed to untrash lead',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // ========================================
        // Buyer Dispatch & History Endpoints
        // ========================================

        // Send lead to specific buyer (manual send)
        this.router.post("/:leadId/send-to-buyer", requirePermission(LeadPermission.SEND), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const { buyer_id } = req.body;

                if (!buyer_id) {
                    return res.status(400).send({ message: 'buyer_id is required' });
                }

                const sendLog = await this.leadService.sendLeadToBuyer(leadId, buyer_id, req.user.id);
                return res.status(200).send(sendLog);
            } catch (error) {
                console.error('Error sending lead to buyer:', error);

                // Handle specific error cases
                if (error instanceof Error) {
                    if (error.message.includes('not found')) {
                        return res.status(404).send({ message: error.message });
                    }
                    if (error.message.includes('Cannot send lead to buyer')) {
                        return res.status(400).send({ message: error.message });
                    }
                }

                return res.status(500).send({
                    message: 'Failed to send lead to buyer',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Get buyer send history for lead
        this.router.get("/:leadId/buyers", async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const history = await this.leadService.getBuyerSendHistory(leadId);
                return res.status(200).send({ buyers: history });
            } catch (error) {
                console.error('Error fetching buyer history:', error);
                return res.status(500).send({
                    message: 'Failed to fetch buyer history',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Unqueue lead from worker
        this.router.post("/:leadId/unqueue", requirePermission(LeadPermission.QUEUE), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const lead = await this.leadService.unqueueLead(leadId, req.user?.id);
                return res.status(200).send(lead);
            } catch (error) {
                return res.status(500).send({ message: error instanceof Error ? error.message : 'Unknown error' });
            }
        });

        // Queue lead for worker
        this.router.post("/:leadId/queue", requirePermission(LeadPermission.QUEUE), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const lead = await this.leadService.queueLead(leadId, req.user?.id);
                return res.status(200).send(lead);
            } catch (error) {
                console.error('Error enabling worker:', error);

                if (error instanceof Error && error.message.includes('not found')) {
                    return res.status(404).send({ message: error.message });
                }

                return res.status(500).send({
                    message: 'Failed to enable worker',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Mark lead as sold to buyer
        this.router.post("/:leadId/buyers/:buyerId/sold", async (req: Request, res: Response) => {
            try {
                const { leadId, buyerId } = req.params;
                const { sold_price } = req.body;

                const outcome = await this.leadService.markSoldToBuyer(
                    leadId,
                    buyerId,
                    sold_price ? Number(sold_price) : undefined
                );

                return res.status(200).send(outcome);
            } catch (error) {
                console.error('Error marking lead as sold:', error);

                if (error instanceof Error && error.message.includes('not found')) {
                    return res.status(404).send({ message: error.message });
                }
                if (error instanceof Error && error.message.includes('Cannot mark as sold')) {
                    return res.status(400).send({ message: error.message });
                }

                return res.status(500).send({
                    message: 'Failed to mark lead as sold',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Unmark lead as sold to buyer
        this.router.delete("/:leadId/buyers/:buyerId/sold", async (req: Request, res: Response) => {
            try {
                const { leadId, buyerId } = req.params;
                const outcome = await this.leadService.unmarkSoldToBuyer(leadId, buyerId);
                return res.status(200).send(outcome);
            } catch (error) {
                console.error('Error unmarking lead as sold:', error);

                if (error instanceof Error && error.message.includes('not found')) {
                    return res.status(404).send({ message: error.message });
                }

                return res.status(500).send({
                    message: 'Failed to unmark lead as sold',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}