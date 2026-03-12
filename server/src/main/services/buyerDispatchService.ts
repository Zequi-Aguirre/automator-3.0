import { injectable } from "tsyringe";
import { WORKER_USER_ID } from "../constants";
import { LeadAction } from "../types/activityTypes";
import BuyerDAO from "../data/buyerDAO";
import LeadDAO from "../data/leadDAO";
import SendLogDAO from "../data/sendLogDAO";
import LeadBuyerOutcomeDAO from "../data/leadBuyerOutcomeDAO";
import CampaignDAO from "../data/campaignDAO";
import WorkerSettingsDAO from "../data/workerSettingsDAO";
import CountyService from "../services/countyService";
import ActivityService from "../services/activityService";
import BuyerWebhookAdapter, { BuyerWebhookResponse } from "../adapters/buyerWebhookAdapter";
import { Lead } from "../types/leadTypes";
import { Buyer } from "../types/buyerTypes";
import { SendLog } from "../types/sendLogTypes";
import { County } from "../types/countyTypes";

@injectable()
export default class BuyerDispatchService {
    constructor(
        private readonly buyerDAO: BuyerDAO,
        private readonly leadDAO: LeadDAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly leadBuyerOutcomeDAO: LeadBuyerOutcomeDAO,
        private readonly campaignDAO: CampaignDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly countyService: CountyService,
        private readonly buyerWebhookAdapter: BuyerWebhookAdapter,
        private readonly activityService: ActivityService
    ) {}

    /**
     * Send lead to specific buyer with full validation and logging
     *
     * @param lead - Lead to send
     * @param buyer - Buyer to send to
     * @param isWorkerSend - If true, updates buyer timing (worker randomization). Default: false (manual/auto-send)
     * @returns SendLog record with response details
     */
    async sendLeadToBuyer(lead: Lead, buyer: Buyer, isWorkerSend: boolean = false, userId?: string | null): Promise<SendLog> {
        // Validation: Can we send this lead to this buyer?
        const canSend = await this.canSendToBuyer(lead, buyer);
        if (!canSend.allowed) {
            throw new Error(`Cannot send lead to buyer: ${canSend.reason}`);
        }

        // Get source_id from campaign if available
        let sourceId: string | null = null;
        if (lead.campaign_id) {
            try {
                const campaign = await this.campaignDAO.getById(lead.campaign_id);
                sourceId = campaign?.source_id || null;
            } catch (error) {
                // Campaign not found or error - continue without source_id
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
            source_id: sourceId,
            campaign_id: lead.campaign_id,
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

        // Log activity — always attribute to a real user (worker or human)
        await this.activityService.log({
            user_id: isWorkerSend ? WORKER_USER_ID : (userId ?? WORKER_USER_ID),
            lead_id: lead.id,
            action: LeadAction.SENT,
            action_details: {
                buyer_id: buyer.id,
                buyer_name: buyer.name,
                source: isWorkerSend ? 'worker' : 'auto_send',
                status: response.success ? 'sent' : 'failed'
            }
        });

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

        // Rule 2: Buyer must not have blocked this lead's source
        // Note: blocked_affiliate_ids column is being repurposed for source IDs
        if (lead.campaign_id && buyer.blocked_affiliate_ids.length > 0) {
            try {
                const campaign = await this.campaignDAO.getById(lead.campaign_id);
                if (campaign?.source_id && buyer.blocked_affiliate_ids.includes(campaign.source_id)) {
                    return { allowed: false, reason: "Buyer has blocked this source" };
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
     * Process buyer's queue - main worker dispatch method
     * Checks timing, gets eligible leads, and sends one if available
     *
     * @param buyerId - Buyer ID to process
     * @returns SendLog if lead was sent, null if no lead available or buyer not ready
     */
    async processBuyerQueue(buyerId: string): Promise<SendLog | null> {
        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) {
            throw new Error(`Buyer ${buyerId} not found`);
        }

        // Check if buyer is ready to send (timing check)
        const ready = await this.isBuyerReadyToSend(buyerId);
        if (!ready) {
            console.log(`[BuyerDispatch][${buyer.name}] Not ready to send (next_send_at: ${buyer.next_send_at})`);
            return null;
        }

        // Get eligible leads for this buyer
        const leads = await this.getEligibleLeadsForBuyer(buyerId);
        if (leads.length === 0) {
            console.log(`[BuyerDispatch][${buyer.name}] No eligible leads available`);
            return null;
        }

        // Pick first lead (oldest) and send it
        const lead = leads[0];
        console.log(`[BuyerDispatch][${buyer.name}] Processing lead ${lead.id} [verified: ${lead.verified}]`);

        try {
            const log = await this.sendLeadToBuyer(lead, buyer, true); // isWorkerSend=true
            console.log(`[BuyerDispatch][${buyer.name}] Successfully sent lead ${lead.id}`);
            return log;
        } catch (error) {
            console.error(`[BuyerDispatch][${buyer.name}] Failed to send lead ${lead.id}:`, error);
            throw error; // Re-throw so WorkerService can handle per-buyer errors
        }
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

        // Random delay between min and max (in minutes)
        const minMinutes = buyer.min_minutes_between_sends;
        const maxMinutes = buyer.max_minutes_between_sends;
        const delayMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;

        // Round to the minute (no seconds/milliseconds)
        const nextSendAt = new Date();
        nextSendAt.setMinutes(nextSendAt.getMinutes() + delayMinutes);
        nextSendAt.setSeconds(0);
        nextSendAt.setMilliseconds(0);

        await this.buyerDAO.updateTiming(buyerId, {
            last_send_at: new Date(),
            next_send_at: nextSendAt,
            total_sends: buyer.total_sends + 1
        });
    }

    /**
     * Check if buyer is ready to send (timing check)
     *
     * @param buyerId - Buyer ID to check
     * @returns true if buyer is ready to send (next_send_at is null or <= NOW)
     */
    async isBuyerReadyToSend(buyerId: string): Promise<boolean> {
        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) {
            throw new Error(`Buyer ${buyerId} not found`);
        }

        // No timing constraint = always ready
        if (!buyer.next_send_at) {
            return true;
        }

        // Check if next_send_at has passed
        const now = new Date();
        const nextSend = new Date(buyer.next_send_at);
        return nextSend <= now;
    }

    /**
     * Get eligible leads for a specific buyer
     * Applies SQL-level filtering (already sent, sold to higher-priority)
     * Then applies business logic filtering (blacklists, cooldowns, business hours)
     *
     * @param buyerId - Buyer ID to get leads for
     * @returns Array of eligible leads (empty if none available)
     */
    async getEligibleLeadsForBuyer(buyerId: string): Promise<Lead[]> {
        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) {
            throw new Error(`Buyer ${buyerId} not found`);
        }

        // Get leads from DAO (SQL-level filtering)
        // Choose verified or unverified based on buyer's validation requirement
        const leads = buyer.requires_validation
            ? await this.leadDAO.getVerifiedLeadsForWorker(buyer.id, buyer.priority)
            : await this.leadDAO.getUnverifiedLeadsForWorker(buyer.id, buyer.priority);

        if (leads.length === 0) {
            return [];
        }

        // Apply additional business logic filters
        const filtered = await this.applyFilters(leads, buyer);

        return filtered;
    }

    /**
     * Apply business logic filters to leads
     * Checks: blacklists, states on hold, cooldowns, business hours
     *
     * @param leads - Leads to filter
     * @param buyer - Buyer with filter settings
     * @returns Filtered leads
     */
    private async applyFilters(leads: Lead[], buyer: Buyer): Promise<Lead[]> {
        if (leads.length === 0) {
            return [];
        }

        const settings = await this.workerSettingsDAO.getCurrentSettings();

        // Use per-buyer cooldown settings
        const delayCountyMs = buyer.enforce_county_cooldown
            ? buyer.delay_same_county * 60 * 60 * 1000
            : 0;

        const delayStateMs = buyer.enforce_state_cooldown
            ? buyer.delay_same_state * 60 * 60 * 1000
            : 0;

        const businessStart = settings.business_hours_start;
        const businessEnd = settings.business_hours_end;

        // Unique IDs for entity lookups
        const countyIds = [...new Set(leads.map(l => l.county_id))];
        const states = [...new Set(leads.map(l => l.state))];

        // Buyer-specific cooldown logs
        let countyLogMap = new Map<string, any>();
        let stateLogMap = new Map<string, any>();

        if (buyer.enforce_county_cooldown && delayCountyMs > 0) {
            const countyLogs = await this.sendLogDAO.getLatestLogsByBuyerAndCounties(buyer.id, countyIds);
            countyLogs.forEach(log => {
                if (log.county_id) {
                    countyLogMap.set(log.county_id, log);
                }
            });
        }

        if (buyer.enforce_state_cooldown && delayStateMs > 0) {
            const stateLogs = await this.sendLogDAO.getLatestLogsByBuyerAndStates(buyer.id, states);
            stateLogs.forEach(log => {
                if (log.state) {
                    stateLogMap.set(log.state, log);
                }
            });
        }

        // Load counties
        const counties = await this.countyService.getManyByIds(countyIds);

        // Build lookup map
        const countiesById = new Map<string, County>();
        counties.forEach(c => countiesById.set(c.id, c));

        // Precompute current local time per timezone
        const timezoneLocalMinute = new Map<string, number>();
        const now = new Date();

        for (const county of counties) {
            const tz = county.timezone;

            // Skip counties with null timezone (auto-created counties missing metadata)
            if (!tz) {
                console.warn(`[BuyerDispatch] County ${county.name} (${county.id}) has null timezone - skipping time zone calculation`);
                continue;
            }

            if (!timezoneLocalMinute.has(tz)) {
                const local = new Date(
                    now.toLocaleString("en-US", { timeZone: tz })
                );
                const minuteOfDay = local.getHours() * 60 + local.getMinutes();
                timezoneLocalMinute.set(tz, minuteOfDay);
            }
        }

        const final: Lead[] = [];

        for (const lead of leads) {
            const county = countiesById.get(lead.county_id);

            // County is required
            if (!county) {
                console.log(`[BuyerDispatch][${buyer.name}] Lead ${lead.id} - BLOCKED: County not found`);
                continue;
            }

            // 1. County blacklist check removed - will be per-buyer in future
            // TODO: Implement per-buyer county blacklists (buyers table should have blacklisted_county_ids)
            // Global county blacklists no longer block sends

            // 2. Buyer-specific state blocking
            if (buyer.states_on_hold.includes(lead.state)) {
                console.log(`[BuyerDispatch][${buyer.name}] Lead ${lead.id} - BLOCKED: State ${lead.state} is on hold`);
                continue;
            }

            // 3. Buyer-specific county cooldown (whitelisted counties skip cooldown)
            if (!county.whitelisted && delayCountyMs > 0) {
                const log = countyLogMap.get(lead.county_id);
                if (log) {
                    const lastSend = new Date(log.created).getTime();
                    const minutesAgo = Math.round((Date.now() - lastSend) / 1000 / 60);
                    if (Date.now() - lastSend <= delayCountyMs) {
                        console.log(`[BuyerDispatch][${buyer.name}] Lead ${lead.id} - BLOCKED: County cooldown (${minutesAgo} min ago)`);
                        continue;
                    }
                }
            }

            // 4. Buyer-specific state cooldown
            if (delayStateMs > 0) {
                const log = stateLogMap.get(lead.state);
                if (log) {
                    const lastSend = new Date(log.created).getTime();
                    const minutesAgo = Math.round((Date.now() - lastSend) / 1000 / 60);
                    if (Date.now() - lastSend <= delayStateMs) {
                        console.log(`[BuyerDispatch][${buyer.name}] Lead ${lead.id} - BLOCKED: State cooldown (${minutesAgo} min ago)`);
                        continue;
                    }
                }
            }

            // 5. Business hours (using precomputed timezone local time)
            const localMin = timezoneLocalMinute.get(county.timezone);
            if (localMin === undefined) {
                console.log(`[BuyerDispatch][${buyer.name}] Lead ${lead.id} - BLOCKED: Could not determine timezone for ${county.timezone}`);
                continue;
            }

            if (localMin < businessStart || localMin >= businessEnd) {
                console.log(`[BuyerDispatch][${buyer.name}] Lead ${lead.id} - BLOCKED: Outside business hours (${Math.floor(localMin / 60)}:${(localMin % 60).toString().padStart(2, '0')} in ${county.timezone})`);
                continue;
            }

            console.log(`[BuyerDispatch][${buyer.name}] Lead ${lead.id} - PASSED all filters`);
            final.push(lead);
        }

        return final;
    }

    /**
     * Check if lead is blocked by higher-priority buyer outcome
     *
     * @param leadId - Lead ID to check
     * @param buyerPriority - Current buyer's priority
     * @returns true if lead is blocked (sold to higher-priority buyer where allow_resell=false)
     */
    private async isLeadBlockedByHigherPriorityBuyer(
        leadId: string,
        buyerPriority: number
    ): Promise<boolean> {
        // Get all outcomes for this lead
        const outcomes = await this.leadBuyerOutcomeDAO.getByLeadId(leadId);

        // Check if any outcome is "sold" to a buyer with higher priority (lower number)
        // AND that outcome has allow_resell=false (blocks resale)
        for (const outcome of outcomes) {
            if (outcome.status === "sold" && outcome.allow_resell === false) {
                // Get the buyer to check priority
                const outcomesBuyer = await this.buyerDAO.getById(outcome.buyer_id);
                if (outcomesBuyer && outcomesBuyer.priority < buyerPriority) {
                    return true; // Blocked by higher-priority buyer who doesn't allow resell
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
