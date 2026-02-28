import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import CountyService from "../services/countyService";
import WorkerSettingsDAO from "../data/workerSettingsDAO";
import SendLogDAO from "../data/sendLogDAO";
import InvestorService from "../services/investorService";
import BuyerDAO from "../data/buyerDAO";
import BuyerDispatchService from "../services/buyerDispatchService";
import { Lead } from "../types/leadTypes";
import { Investor } from "../types/investorTypes";
import { County } from "../types/countyTypes";

@injectable()
export default class WorkerService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly countyService: CountyService,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly investorService: InvestorService,
        private readonly buyerDAO: BuyerDAO,
        private readonly buyerDispatchService: BuyerDispatchService
    ) {}

    async isTimeToSend(): Promise<boolean> {
        // Deprecated: Timing is now per-buyer (buyers.next_send_at)
        // Always return true since timing is checked per-buyer in sendNextLead()
        return true;
    }

    async pickLeadForWorker(): Promise<Lead> {
        const leads = await this.leadDAO.getLeadsToSendByWorker();

        if (leads.length === 0) {
            throw new Error("No leads available for worker");
        }

        // No buyer-specific filtering for legacy method
        const filtered = await this.applyFilters(leads);

        if (filtered.length === 0) {
            throw new Error("No leads available after applying worker filters");
        }

        // Return oldest lead (first in array since sorted by created ASC)
        return filtered[0];
    }

    /**
     * Pick lead based on buyer's validation requirement
     * Prioritizes unverified leads for buyers that don't require validation
     * Saves verified leads for buyers that require validation
     */
    async pickLeadForBuyer(buyer: {
        id: string;
        name: string;
        requires_validation: boolean;
        delay_same_county: number;
        delay_same_state: number;
        enforce_county_cooldown: boolean;
        enforce_state_cooldown: boolean;
        states_on_hold: string[];
    }): Promise<Lead> {
        // Get leads based on buyer's validation requirement
        // Pass buyer.id to exclude leads already sent to this buyer
        const leads = buyer.requires_validation
            ? await this.leadDAO.getVerifiedLeadsForWorker(buyer.id)
            : await this.leadDAO.getUnverifiedLeadsForWorker(buyer.id);

        if (leads.length === 0) {
            // If no preferred leads, fallback to any available leads
            const fallbackLeads = await this.leadDAO.getLeadsToSendByWorker(buyer.id);
            if (fallbackLeads.length === 0) {
                throw new Error(`No leads available for ${buyer.name}`);
            }

            const filtered = await this.applyFilters(fallbackLeads, buyer);
            if (filtered.length === 0) {
                throw new Error(`No leads available for ${buyer.name} after applying filters`);
            }

            // Return oldest lead (first in array since sorted by created ASC)
            return filtered[0];
        }

        // Apply buyer-specific filters
        const filtered = await this.applyFilters(leads, buyer);

        if (filtered.length === 0) {
            throw new Error(`No ${buyer.requires_validation ? 'verified' : 'unverified'} leads available for ${buyer.name} after applying filters`);
        }

        // Return oldest lead (first in array since sorted by created ASC)
        return filtered[0];
    }

    async trashExpiredLeads(): Promise<number> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();

        // Check if expiration enforcement is enabled
        if (!settings.enforce_expiration) {
            console.log('[Worker] Expiration enforcement disabled - skipping trash expired leads');
            return 0;
        }

        const expireHours =
            Number(settings.expire_after_hours) || 18;

        const reason = `EXPIRED_${expireHours}_HOURS`;

        return await this.leadDAO.trashExpiredLeads(
            expireHours,
            reason
        );
    }

    private async applyFilters(leads: Lead[], buyer?: {
        id: string;
        delay_same_county: number;
        delay_same_state: number;
        enforce_county_cooldown: boolean;
        enforce_state_cooldown: boolean;
        states_on_hold: string[];
    }): Promise<Lead[]> {
        if (leads.length === 0) {
            return [];
        }

        const settings = await this.workerSettingsDAO.getCurrentSettings();

        // Use per-buyer cooldown settings if buyer provided
        const delayCountyMs = buyer && buyer.enforce_county_cooldown
            ? buyer.delay_same_county * 60 * 60 * 1000
            : 0;

        const delayStateMs = buyer && buyer.enforce_state_cooldown
            ? buyer.delay_same_state * 60 * 60 * 1000
            : 0;

        const businessStart = settings.business_hours_start;
        const businessEnd = settings.business_hours_end;

        // Unique IDs for entity lookups
        const countyIds = [...new Set(leads.map(l => l.county_id))];
        const investorIds = [...new Set(
            leads.filter(l => l.investor_id).map(l => l.investor_id!)
        )];
        const states = [...new Set(leads.map(l => l.state))];

        // Buyer-specific cooldown logs (only if buyer provided and enforcement enabled)
        let countyLogMap = new Map<string, any>();
        let stateLogMap = new Map<string, any>();

        if (buyer) {
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
        }

        // Load entities - only investors and counties
        const investors = investorIds.length > 0
            ? await this.investorService.getManyByIds(investorIds)
            : [];
        const counties = await this.countyService.getManyByIds(countyIds);

        // Build lookup maps
        const investorsById = new Map<string, Investor>();
        const countiesById = new Map<string, County>();

        investors.forEach(i => investorsById.set(i.id, i));
        counties.forEach(c => countiesById.set(c.id, c));

        // Precompute current local time per timezone
        const timezoneLocalMinute = new Map<string, number>();
        const now = new Date();

        for (const county of counties) {
            const tz = county.timezone;
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
            const investor = lead.investor_id ? investorsById.get(lead.investor_id) : null;
            const county = countiesById.get(lead.county_id);

            // County is required
            if (!county) {
                console.log(`[Filter] Lead ${lead.id} - BLOCKED: County not found`);
                continue;
            }

            // 1. Blacklist checks
            if (county.blacklisted) {
                console.log(`[Filter] Lead ${lead.id} - BLOCKED: County ${county.name} is blacklisted`);
                continue;
            }
            if (investor && investor.blacklisted) {
                console.log(`[Filter] Lead ${lead.id} - BLOCKED: Investor is blacklisted`);
                continue;
            }

            // 2. Buyer-specific state blocking
            if (buyer && buyer.states_on_hold.includes(lead.state)) {
                console.log(`[Filter] Lead ${lead.id} - BLOCKED: State ${lead.state} is on hold for buyer ${buyer.id}`);
                continue;
            }

            // 3. Buyer-specific county cooldown (whitelisted counties skip cooldown)
            if (!county.whitelisted && delayCountyMs > 0) {
                const log = countyLogMap.get(lead.county_id);
                if (log) {
                    const lastSend = new Date(log.created).getTime();
                    const minutesAgo = Math.round((Date.now() - lastSend) / 1000 / 60);
                    if (Date.now() - lastSend <= delayCountyMs) {
                        console.log(`[Filter] Lead ${lead.id} - BLOCKED: County cooldown for buyer (${minutesAgo} min ago)`);
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
                        console.log(`[Filter] Lead ${lead.id} - BLOCKED: State cooldown for buyer (${minutesAgo} min ago)`);
                        continue;
                    }
                }
            }

            // 5. Business hours (using precomputed timezone local time)
            const localMin = timezoneLocalMinute.get(county.timezone);
            if (localMin === undefined) {
                console.log(`[Filter] Lead ${lead.id} - BLOCKED: Could not determine timezone for ${county.timezone}`);
                continue;
            }

            if (localMin < businessStart || localMin >= businessEnd) {
                console.log(`[Filter] Lead ${lead.id} - BLOCKED: Outside business hours (${Math.floor(localMin / 60)}:${(localMin % 60).toString().padStart(2, '0')} in ${county.timezone}, need ${Math.floor(businessStart / 60)}:${(businessStart % 60).toString().padStart(2, '0')}-${Math.floor(businessEnd / 60)}:${(businessEnd % 60).toString().padStart(2, '0')})`);
                continue;
            }

            console.log(`[Filter] Lead ${lead.id} - PASSED all filters`);
            final.push(lead);
        }

        return final;
    }

    /**
     * Send leads to all eligible worker buyers
     * Returns count of successful sends
     */
    async sendNextLead(): Promise<number> {
        // Get all buyers with dispatch_mode 'worker' or 'both'
        const allBuyers = await this.buyerDAO.getByPriority();
        const workerBuyers = allBuyers.filter(b =>
            b.dispatch_mode === 'worker' || b.dispatch_mode === 'both'
        );

        if (workerBuyers.length === 0) {
            console.log('[Worker] No worker buyers configured');
            return 0;
        }

        // Filter for buyers where next_send_at <= NOW (eligible to send)
        const now = new Date();
        const eligibleBuyers = workerBuyers.filter(b => {
            if (!b.next_send_at) return true; // No timing constraint = eligible
            return new Date(b.next_send_at) <= now;
        });

        if (eligibleBuyers.length === 0) {
            console.log('[Worker] No eligible buyers (all waiting for next_send_at)');
            return 0;
        }

        // Already sorted by priority from getByPriority()
        console.log(`[Worker] Found ${eligibleBuyers.length} eligible buyers`);

        let sendCount = 0;

        // Send to ALL eligible buyers (Option B)
        for (const buyer of eligibleBuyers) {
            try {
                // Pick lead based on buyer's validation requirement
                // Prioritizes unverified for buyers that don't require validation
                const lead = await this.pickLeadForBuyer(buyer);

                // Send via buyer dispatch service with isWorkerSend=true
                await this.buyerDispatchService.sendLeadToBuyer(lead, buyer, true);

                console.log(`[Worker] Sent lead ${lead.id} to buyer ${buyer.name} (priority ${buyer.priority}) [verified: ${lead.verified}]`);
                sendCount++;
            } catch (error) {
                // Log error but continue to next buyer
                console.error(`[Worker] Failed to send to buyer ${buyer.name}:`, error);
            }
        }

        return sendCount;
    }

    /**
     * Force send specific lead to first eligible worker buyer
     * Used for manual worker triggers
     */
    async forceSendLead(leadId: string): Promise<void> {
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) {
            throw new Error(`Lead ${leadId} not found`);
        }

        // Get first worker buyer
        const allBuyers = await this.buyerDAO.getByPriority();
        const workerBuyer = allBuyers.find(b =>
            b.dispatch_mode === 'worker' || b.dispatch_mode === 'both'
        );

        if (!workerBuyer) {
            throw new Error('No worker buyers configured');
        }

        // Send with worker timing update
        await this.buyerDispatchService.sendLeadToBuyer(lead, workerBuyer, true);
        console.log(`[Worker] Force sent lead ${leadId} to ${workerBuyer.name}`);
    }
}