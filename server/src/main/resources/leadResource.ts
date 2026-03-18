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
        // Get tab counts for badge display
        this.router.get("/counts", requirePermission(LeadPermission.READ), async (_req: Request, res: Response) => {
            try {
                const counts = await this.leadService.getTabCounts();
                return res.status(200).send(counts);
            } catch (error) {
                console.error('Error fetching tab counts:', error);
                return res.status(500).send({
                    message: 'Failed to fetch tab counts',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Get many leads with pagination and oldDatabase support
        this.router.get("/get-many", requirePermission(LeadPermission.READ), async (req: Request, res: Response) => {
            try {
                const filters: LeadFilters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 10,
                    search: req.query.search ? String(req.query.search) : "",
                    status: (req.query.status ? String(req.query.status) : 'new') as LeadFilters['status'],
                    // TICKET-066: Sent tab advanced filters
                    buyer_id: req.query.buyer_id ? String(req.query.buyer_id) : undefined,
                    send_source: req.query.send_source ? String(req.query.send_source) as LeadFilters['send_source'] : undefined,
                    source_id: req.query.source_id ? String(req.query.source_id) : undefined,
                    campaign_id: req.query.campaign_id ? String(req.query.campaign_id) : undefined,
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
        this.router.get("/get/:leadId", requirePermission(LeadPermission.READ), async (req: Request, res: Response) => {
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
        this.router.patch("/update/:leadId", requirePermission(LeadPermission.EDIT), async (req: Request, res: Response) => {
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
        this.router.patch("/send/:leadId", requirePermission(LeadPermission.SEND), async (req: Request, res: Response) => {
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
                const reason = req.body?.reason;
                if (!reason || typeof reason !== 'string' || reason.trim() === '') {
                    return res.status(400).send({ message: 'A trash reason is required' });
                }
                const response = await this.leadService.trashLead(leadId, "MANUAL_USER_DELETE", req.user?.id, reason.trim());
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
                const { buyer_id, force } = req.body;

                if (!buyer_id) {
                    return res.status(400).send({ message: 'buyer_id is required' });
                }

                const sendLog = await this.leadService.sendLeadToBuyer(leadId, buyer_id, req.user.id, force === true);
                return res.status(200).send(sendLog);
            } catch (error) {
                console.error('Error sending lead to buyer:', error);

                // Handle specific error cases
                if (error instanceof Error) {
                    if (error.message.includes('not found')) {
                        return res.status(404).send({ message: error.message });
                    }
                    if (error.message === 'ALREADY_SENT') {
                        return res.status(409).send({ message: 'Lead already successfully sent to this buyer', already_sent: true });
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
        this.router.get("/:leadId/buyers", requirePermission(LeadPermission.READ), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const result = await this.leadService.getBuyerSendHistory(leadId);
                return res.status(200).send(result);
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
        this.router.post("/:leadId/buyers/:buyerId/sold", requirePermission(LeadPermission.SEND), async (req: Request, res: Response) => {
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
        this.router.delete("/:leadId/buyers/:buyerId/sold", requirePermission(LeadPermission.SEND), async (req: Request, res: Response) => {
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

        // TICKET-064: Resolve needs_review flag (staff filled in missing info)
        this.router.patch("/resolve-review/:leadId", requirePermission(LeadPermission.EDIT), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const lead = await this.leadService.resolveNeedsReview(leadId, req.user?.id);
                return res.status(200).send(lead);
            } catch (error) {
                console.error('Error resolving needs_review:', error);
                return res.status(500).send({
                    message: 'Failed to resolve review flag',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // TICKET-065: Request a call for a lead
        this.router.post("/:leadId/request-call", requirePermission(LeadPermission.CALL_REQUEST), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const { reason, note } = req.body;
                if (!reason) {
                    return res.status(400).send({ message: 'reason is required' });
                }
                const lead = await this.leadService.requestCall(leadId, reason, req.user.id, note ?? null);
                return res.status(200).send(lead);
            } catch (error) {
                console.error('Error requesting call:', error);
                return res.status(500).send({
                    message: 'Failed to request call',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // TICKET-065: Cancel a pending call request
        this.router.post("/:leadId/cancel-call-request", requirePermission(LeadPermission.CALL_REQUEST), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const lead = await this.leadService.cancelCallRequest(leadId, req.user.id);
                return res.status(200).send(lead);
            } catch (error) {
                console.error('Error cancelling call request:', error);
                return res.status(500).send({
                    message: 'Failed to cancel call request',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // TICKET-065/123: Log a call attempt and outcome
        this.router.post("/:leadId/execute-call", requirePermission(LeadPermission.CALL_EXECUTE), async (req: Request, res: Response) => {
            try {
                const { leadId } = req.params;
                const { outcomeId, notes } = req.body;
                if (!outcomeId) {
                    return res.status(400).send({ message: 'outcomeId is required' });
                }
                const lead = await this.leadService.executeCall(leadId, outcomeId, notes ?? null, req.user.id);
                return res.status(200).send(lead);
            } catch (error) {
                console.error('Error executing call:', error);
                return res.status(500).send({
                    message: 'Failed to log call',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}