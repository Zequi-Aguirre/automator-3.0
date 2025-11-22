import {injectable} from "tsyringe";
import LeadDAO from "../data/leadDAO";
import LeadService from "../services/leadService";
import CountyService from "../services/countyService";
import WorkerSettingsDAO from "../data/workerSettingsDAO";
import SendLogDAO from "../data/sendLogDAO";
import InvestorService from "../services/investorService";
import CampaignService from "../services/campaignService";
import AffiliateService from "../services/affiliateService";
import {Lead} from "../types/leadTypes";
import {Investor} from "../types/investorTypes";
import {County} from "../types/countyTypes";
import {Campaign} from "../types/campaignTypes";
import {Affiliate} from "../types/affiliateTypes";

@injectable()
export default class WorkerService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadService: LeadService,
        private readonly countyService: CountyService,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly investorService: InvestorService,
        private readonly campaignService: CampaignService,
        private readonly affiliateService: AffiliateService
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

        const reason = "expired";

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
            (settings.delay_same_investor || 0) * 24 * 60 * 60 * 1000;

        const delayCountyMs =
            (settings.delay_same_county || 36) * 60 * 60 * 1000;

        const businessStart = settings.business_hours_start;
        const businessEnd = settings.business_hours_end;

        // Unique IDs
        const investorIds = [...new Set(leads.map(l => l.investor_id))];
        const countyIds = [...new Set(leads.map(l => l.county_id))];
        const campaignIds = [...new Set(leads.map(l => l.campaign_id))];

        // Cooldown logs
        const [investorLogs, countyLogs] = await Promise.all([
            this.sendLogDAO.getLatestLogsByInvestorIds(investorIds),
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

        // Load entities
        const investors = await this.investorService.getManyByIds(investorIds);
        const counties = await this.countyService.getManyByIds(countyIds);
        const campaigns = await this.campaignService.getManyByIds(campaignIds);

        const affiliateIds = [...new Set(campaigns.map(c => c.affiliate_id))];
        const affiliates = await this.affiliateService.getManyByIds(affiliateIds);

        // Build lookup maps
        const investorsById = new Map<string, Investor>();
        const countiesById = new Map<string, County>();
        const campaignsById = new Map<string, Campaign>();
        const affiliatesById = new Map<string, Affiliate>();

        investors.forEach(i => investorsById.set(i.id, i));
        counties.forEach(c => countiesById.set(c.id, c));
        campaigns.forEach(c => campaignsById.set(c.id, c));
        affiliates.forEach(a => affiliatesById.set(a.id, a));

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
            const investor = investorsById.get(lead.investor_id);
            const county = countiesById.get(lead.county_id);
            const campaign = campaignsById.get(lead.campaign_id);
            const affiliate = campaign ? affiliatesById.get(campaign.affiliate_id) : undefined;

            if (!investor || !county || !campaign || !affiliate) {
                continue;
            }

            // 1. Blacklist checks
            if (affiliate.blacklisted) continue;
            if (campaign.blacklisted) continue;
            if (county.blacklisted) continue;
            if (investor.blacklisted) continue;

            // 2. Investor cooldown
            if (!investor.whitelisted && delayInvestorMs > 0) {
                const log = investorLogMap.get(lead.investor_id);
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

    async sendNextLead(): Promise<Lead> {
        const lead = await this.pickLeadForWorker();
        const sentLead = await this.leadService.sendLead(lead.id);
        await this.scheduleNext();
        return sentLead;
    }

    async forceSendLead(leadId: string): Promise<Lead> {
        const sent = await this.leadService.sendLead(leadId);
        await this.scheduleNext();
        return sent;
    }

    private async scheduleNext(): Promise<void> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const { minutes_range_start, minutes_range_end } = settings;

        const nextLeadTime = new Date();
        const random = Math.floor(
            Math.random() * (minutes_range_end - minutes_range_start + 1)
        ) + minutes_range_start;

        nextLeadTime.setMinutes(nextLeadTime.getMinutes() + random);

        await this.workerSettingsDAO.updateNextLeadTime(
            settings.id,
            nextLeadTime.toISOString()
        );
    }
}