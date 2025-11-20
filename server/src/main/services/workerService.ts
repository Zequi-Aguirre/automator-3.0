import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import LeadService from "../services/leadService";
import CountyService from "../services/countyService";
import WorkerSettingsDAO from "../data/workerSettingsDAO";
import SendLogDAO from "../data/sendLogDAO";
import { Lead } from "../types/leadTypes";

@injectable()
export default class WorkerService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadService: LeadService,
        private readonly countyService: CountyService,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly sendLogDAO: SendLogDAO
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

    private async applyFilters(leads: Lead[]): Promise<Lead[]> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const delayMs = (settings.delay_same_county || 36) * 60 * 60 * 1000;
        const countyIds = leads.map(l => l.county_id);
        const uniqueCountyIds = [...new Set(countyIds)];
        const recentLogs = await this.sendLogDAO.getLatestLogsByCountyIds(uniqueCountyIds);

        const withDelayRule = leads.filter(lead => {
            const log = recentLogs.find(l => l.county_id === lead.county_id);
            if (!log) {
                return true;
            }
            return Date.now() - new Date(log.created).getTime() > delayMs;
        });

        const withBusinessHours = [];
        for (const lead of withDelayRule) {
            const county = await this.countyService.getById(lead.county_id);
            if (!county) {
                continue;
            }
            if (await this.isWithinBusinessHours(county.timezone)) {
                withBusinessHours.push(lead);
            }
        }

        return withBusinessHours;
    }

    private async isWithinBusinessHours(timezone: string): Promise<boolean> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const { business_hours_start, business_hours_end } = settings;

        const now = new Date();

        // Convert local time in that timezone into minutes since midnight
        const local = new Date(
            now.toLocaleString("en-US", { timeZone: timezone })
        );

        const hour = local.getHours();
        const minute = local.getMinutes();
        const totalMinutes = hour * 60 + minute;

        return totalMinutes >= business_hours_start && totalMinutes < business_hours_end;
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
        const random = Math.floor(Math.random() * (minutes_range_end - minutes_range_start + 1)) + minutes_range_start;
        nextLeadTime.setMinutes(nextLeadTime.getMinutes() + random);

        await this.workerSettingsDAO.updateNextLeadTime(settings.id, nextLeadTime.toISOString());
    }
}