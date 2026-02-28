import { injectable } from "tsyringe";
import BuyerDAO from "../data/buyerDAO";
import SendLogDAO from "../data/sendLogDAO";
import LeadBuyerOutcomeDAO from "../data/leadBuyerOutcomeDAO";
import CampaignDAO from "../data/campaignDAO";
import BuyerWebhookAdapter, { BuyerWebhookResponse } from "../adapters/buyerWebhookAdapter";
import { Lead } from "../types/leadTypes";
import { Buyer } from "../types/buyerTypes";
import { SendLog } from "../types/sendLogTypes";

@injectable()
export default class BuyerDispatchService {
    constructor(
        private readonly buyerDAO: BuyerDAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly leadBuyerOutcomeDAO: LeadBuyerOutcomeDAO,
        private readonly campaignDAO: CampaignDAO,
        private readonly buyerWebhookAdapter: BuyerWebhookAdapter
    ) {}

    /**
     * Send lead to specific buyer with full validation and logging
     *
     * @param lead - Lead to send
     * @param buyer - Buyer to send to
     * @param isWorkerSend - If true, updates buyer timing (worker randomization). Default: false (manual/auto-send)
     * @returns SendLog record with response details
     */
    async sendLeadToBuyer(lead: Lead, buyer: Buyer, isWorkerSend: boolean = false): Promise<SendLog> {
        // Validation: Can we send this lead to this buyer?
        const canSend = await this.canSendToBuyer(lead, buyer);
        if (!canSend.allowed) {
            throw new Error(`Cannot send lead to buyer: ${canSend.reason}`);
        }

        // Get affiliate_id from campaign if available
        let affiliateId: string | null = null;
        if (lead.campaign_id) {
            try {
                const campaign = await this.campaignDAO.getById(lead.campaign_id);
                affiliateId = campaign.affiliate_id;
            } catch (error) {
                // Campaign not found or error - continue without affiliate_id
                console.warn(`Could not fetch campaign ${lead.campaign_id}:`, error);
            }
        }

        // Get auth config (decrypted)
        const authConfig = await this.buyerDAO.getAuthConfig(buyer.id);
        if (!authConfig) {
            throw new Error(`No auth config found for buyer ${buyer.id}`);
        }

        // Build payload (map lead fields to buyer's expected format)
        const payload = this.buildPayload(lead);

        // Send to actual webhook (Make.com URLs configured per environment)
        const response: BuyerWebhookResponse = await this.buyerWebhookAdapter.sendToBuyer(
            buyer.webhook_url,
            payload,
            authConfig
        );

        // Log the attempt to send_log
        const log = await this.sendLogDAO.createLog({
            lead_id: lead.id,
            buyer_id: buyer.id,
            affiliate_id: affiliateId,
            campaign_id: lead.campaign_id,
            investor_id: lead.investor_id,
            status: response.success ? "sent" : "failed"
        });

        // Update log with response details
        const updatedLog = await this.sendLogDAO.updateLog(log.id, {
            response_code: response.statusCode,
            response_body: JSON.stringify(response.responseBody || response.error),
            payout_cents: null // TODO: Parse from response body if buyer provides it
        });

        // Schedule buyer's next send time (randomized delay)
        // Only for worker sends - manual/auto-send should not update timing
        if (isWorkerSend) {
            await this.scheduleBuyerNext(buyer.id);
        }

        // Return updated log
        return updatedLog;
    }

    /**
     * Validate if lead can be sent to buyer
     *
     * @param lead - Lead to validate
     * @param buyer - Buyer to validate
     * @returns Validation result with reason if not allowed
     */
    async canSendToBuyer(
        lead: Lead,
        buyer: Buyer
    ): Promise<{ allowed: boolean; reason?: string }> {
        // Rule 1: Lead must require validation if buyer requires_validation=true
        if (buyer.requires_validation && !lead.verified) {
            return { allowed: false, reason: "Buyer requires validation, but lead is not validated" };
        }

        // Rule 2: Buyer must not have blocked this lead's affiliate
        if (lead.campaign_id && buyer.blocked_affiliate_ids.length > 0) {
            try {
                const campaign = await this.campaignDAO.getById(lead.campaign_id);
                if (buyer.blocked_affiliate_ids.includes(campaign.affiliate_id)) {
                    return { allowed: false, reason: "Buyer has blocked this affiliate" };
                }
            } catch (error) {
                // Campaign not found - continue with other validations
                console.warn(`Could not fetch campaign ${lead.campaign_id} for affiliate blocking check:`, error);
            }
        }

        // Rule 3: Lead must not be sold to higher-priority buyer (check lead_buyer_outcomes)
        const isBlocked = await this.isLeadBlockedByHigherPriorityBuyer(lead.id, buyer.priority);
        if (isBlocked) {
            return { allowed: false, reason: "Lead already sold to higher-priority buyer" };
        }

        // Rule 4: Lead must not have been successfully sent to this buyer already
        const alreadySent = await this.sendLogDAO.wasSuccessfullySentToBuyer(lead.id, buyer.id);
        if (alreadySent) {
            return { allowed: false, reason: "Lead already successfully sent to this buyer" };
        }

        return { allowed: true };
    }

    /**
     * Schedule buyer's next send time with randomized delay
     * Uses buyer's min_minutes_between_sends and max_minutes_between_sends
     *
     * @param buyerId - Buyer ID to schedule
     */
    async scheduleBuyerNext(buyerId: string): Promise<void> {
        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) {
            throw new Error(`Buyer ${buyerId} not found`);
        }

        // Random delay between min and max
        const minMs = buyer.min_minutes_between_sends * 60 * 1000;
        const maxMs = buyer.max_minutes_between_sends * 60 * 1000;
        const delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

        const nextSendAt = new Date(Date.now() + delayMs);

        await this.buyerDAO.updateTiming(buyerId, {
            last_send_at: new Date(),
            next_send_at: nextSendAt,
            total_sends: buyer.total_sends + 1
        });
    }

    /**
     * Check if lead is blocked by higher-priority buyer outcome
     *
     * @param leadId - Lead ID to check
     * @param buyerPriority - Current buyer's priority
     * @returns true if lead is blocked (sold to higher-priority buyer)
     */
    private async isLeadBlockedByHigherPriorityBuyer(
        leadId: string,
        buyerPriority: number
    ): Promise<boolean> {
        // Get all outcomes for this lead
        const outcomes = await this.leadBuyerOutcomeDAO.getByLeadId(leadId);

        // Check if any outcome is "sold" to a buyer with higher priority (lower number)
        for (const outcome of outcomes) {
            if (outcome.status === "sold") {
                // Get the buyer to check priority
                const outcomesBuyer = await this.buyerDAO.getById(outcome.buyer_id);
                if (outcomesBuyer && outcomesBuyer.priority < buyerPriority) {
                    return true; // Blocked by higher-priority buyer
                }
            }
        }

        return false;
    }

    /**
     * Build webhook payload from lead data
     * Maps lead fields to buyer's expected format
     *
     * @param lead - Lead to transform
     * @returns Payload object ready for webhook
     */
    private buildPayload(lead: Lead): Record<string, any> {
        return {
            // Lead identifiers
            lead_id: lead.id,

            // Contact info
            first_name: lead.first_name,
            last_name: lead.last_name,
            email: lead.email,
            phone: lead.phone,

            // Address
            address: lead.address,
            city: lead.city,
            state: lead.state,
            county: lead.county,
            zipcode: lead.zipcode,

            // Metadata
            verified: lead.verified
        };
    }
}
