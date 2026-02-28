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
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const { send_next_lead_at } = settings;

        if (!send_next_lead_at) {
            return true;
        }

        const next = new Date(send_next_lead_at);
        return next <= new Date();
    }

    async pickLeadForWorker(): Promise<Lead> {
        const leads = await this.leadDAO.getLeadsToSendByWorker();

        if (leads.length === 0) {
            throw new Error("No leads available for worker");
        }

        const filtered = await this.applyFilters(leads);

        if (filtered.length === 0) {
            throw new Error("No leads available after applying worker filters");
        }

        const randomIndex = Math.floor(Math.random() * filtered.length);
        return filtered[randomIndex];
    }

    async trashExpiredLeads(): Promise<number> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();

        const expireHours =
            Number(settings.expire_after_hours) || 18;

        const reason = `EXPIRED_${expireHours}_HOURS`;

        return await this.leadDAO.trashExpiredLeads(
            expireHours,
            reason
        );
    }

    private async applyFilters(leads: Lead[]): Promise<Lead[]> {
        if (leads.length === 0) {
            return [];
        }

        const settings = await this.workerSettingsDAO.getCurrentSettings();

        const delayInvestorMs =
            (settings.delay_same_investor || 0) * 60 * 60 * 1000;

        const delayCountyMs =
            (settings.delay_same_county || 36) * 60 * 60 * 1000;

        const businessStart = settings.business_hours_start;
        const businessEnd = settings.business_hours_end;

        // Unique IDs - investor is now optional
        const investorIds = [...new Set(
            leads
                .filter(l => l.investor_id)
                .map(l => l.investor_id!)
        )];
        const countyIds = [...new Set(leads.map(l => l.county_id))];

        // Cooldown logs
        const [investorLogs, countyLogs] = await Promise.all([
            investorIds.length > 0
                ? this.sendLogDAO.getLatestLogsByInvestorIds(investorIds)
                : [],
            this.sendLogDAO.getLatestLogsByCountyIds(countyIds)
        ]);

        const investorLogMap = new Map<string, any>();
        investorLogs.forEach(log => {
            if (log.investor_id) {
                investorLogMap.set(log.investor_id, log);
            }
        });

        const countyLogMap = new Map<string, any>();
        countyLogs.forEach(log => {
            if (log.county_id) {
                countyLogMap.set(log.county_id, log);
            }
        });

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
                continue;
            }

            // 1. Blacklist checks (only county and investor now)
            if (county.blacklisted) continue;
            if (investor && investor.blacklisted) continue;

            // 2. Investor cooldown (only if investor exists)
            if (investor && !investor.whitelisted && delayInvestorMs > 0) {
                const log = investorLogMap.get(lead.investor_id!);
                if (log) {
                    const lastSend = new Date(log.created).getTime();
                    if (Date.now() - lastSend <= delayInvestorMs) {
                        continue;
                    }
                }
            }

            // 3. County cooldown
            if (!county.whitelisted && delayCountyMs > 0) {
                const log = countyLogMap.get(lead.county_id);
                if (log) {
                    const lastSend = new Date(log.created).getTime();
                    if (Date.now() - lastSend <= delayCountyMs) {
                        continue;
                    }
                }
            }

            // 4. Business hours (using precomputed timezone local time)
            const localMin = timezoneLocalMinute.get(county.timezone);
            if (localMin === undefined) {
                continue;
            }

            if (localMin < businessStart || localMin >= businessEnd) {
                continue;
            }

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
                // Pick a random lead for this buyer
                const lead = await this.pickLeadForWorker();

                // Send via buyer dispatch service with isWorkerSend=true
                await this.buyerDispatchService.sendLeadToBuyer(lead, buyer, true);

                console.log(`[Worker] Sent lead ${lead.id} to buyer ${buyer.name} (priority ${buyer.priority})`);
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