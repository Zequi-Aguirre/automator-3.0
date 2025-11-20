import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { Lead, LeadFilters } from "../types/leadTypes";
import { parseCsvToLeads } from "../middleware/parseCsvToLeads.ts";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";
import CountyService from "../services/countyService.ts";
import CampaignService from "../services/campaignService.ts";
import AffiliateService from "../services/affiliateService.ts";
import InvestorService from "../services/investorService.ts";
import LeadFormInputDAO from "../data/leadFormInputDAO.ts";
import ISpeedToLeadIAO from "../vendor/iSpeedToLeadIAO.ts";
import SendLogDAO from "../data/sendLogDAO.ts";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";

@injectable()
export default class LeadService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadFormInputDAO: LeadFormInputDAO,
        private readonly countyService: CountyService,
        private readonly campaignService: CampaignService,
        private readonly affiliateService: AffiliateService,
        private readonly investorService: InvestorService,
        private readonly iSpeedToLeadIAO: ISpeedToLeadIAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO
    ) {}

    // Lead Management Methods
    async getLeadById(leadId: string): Promise<Lead | null> {
        try {
            return await this.leadDAO.getById(leadId);
        } catch (error) {
            console.error('Error fetching lead by ID:', {
                leadId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw new Error(
                `Failed to fetch lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async updateLead(leadId: string, leadData: Partial<Lead>): Promise<Lead> {
        return await this.leadDAO.updateLead(leadId, leadData);
    }

    async getLeadsToSendByWorker(): Promise<Lead[]> {
        console.log('LeadService: Fetching leads to send by worker');
        // get all verified not deleted leads and randomly pick one
        const leads = await this.leadDAO.getLeadsToSendByWorker();
        console.log(`LeadService: Found ${leads.length} leads to send by worker`, leads);
        if (leads.length === 0) {
            throw new Error("No leads available to send");
        }

        return leads;
    }

    async sendLead(leads: Lead[]): Promise<Lead> {
        // TODO this function should just send the lead. The lead selection logic should be moved to the worker.
        // TODO move all functionally into smaller private methods.
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const delay_same_county = settings.delay_same_county || 36; // default to 36 hours

        const countyIds = leads.map(l => l.county_id);
        // Remove dupes
        const uniqueCountyIds = [...new Set(countyIds)];
        console.log('Unique county IDs for leads:', uniqueCountyIds);
        const recentLogs = await this.sendLogDAO.getLatestLogsByCountyIds(uniqueCountyIds);
        console.log('Recent send logs by county:', recentLogs);
        // Now filter leads based on delay
        const delayMs = delay_same_county * 60 * 60 * 1000;

        const allowedLeads = leads.filter(lead => {
            const log = recentLogs.find(log => log.county_id === lead.county_id);
            if (!log) return true;
            return Date.now() - new Date(log.created).getTime() > delayMs;
        });

        if (allowedLeads.length === 0) {
            throw new Error("No leads available to send after applying county delay");
        }
        // Randomly select one lead from allowed leads
        const randomIndex = Math.floor(Math.random() * allowedLeads.length);
        const leadId = leads[randomIndex].id;

        // --- Fetch lead ------------------------------------------------------
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) throw new Error("Lead not found");
        if (lead.sent) throw new Error("Lead already sent");
        if (!lead.verified) throw new Error("Lead must be verified first");

        // --- Fetch form ------------------------------------------------------
        const form = await this.leadFormInputDAO.getByLeadId(lead.id);
        if (!form) throw new Error("Lead is missing form data");

        // --- Fetch related entities -----------------------------------------
        const campaign = await this.campaignService.getById(lead.campaign_id);
        const affiliate = await this.affiliateService.getById(campaign!.affiliate_id);
        const investor = await this.investorService.getById(lead.investor_id);

        // --- Build payload ---------------------------------------------------
        const payload = {
            form_first_name: lead.first_name,
            form_last_name: lead.last_name,
            form_phone: lead.phone,
            form_email: lead.email,
            form_address: lead.address,
            form_city: lead.city,
            form_state: lead.state,
            form_zip: lead.zipcode,
            ...form
        };

        // remove 'created' and 'modified' fields if present
        delete (payload as any).created;
        delete (payload as any).modified;

        // --- Create initial send_log ----------------------------------------
        const log = await this.sendLogDAO.createLog({
            lead_id: lead.id,
            affiliate_id: affiliate.id,
            campaign_id: campaign!.id,
            investor_id: investor!.id,
            status: "sent"
        });

        try {
            // --- Send lead to ISpeedToLead ----------------------------------
            const axiosResponse = await this.iSpeedToLeadIAO.sendLead(payload);
            const response = axiosResponse.data; // typed correctly

            const payoutCents = (() => {
                const payout = response.data?.payout;
                if (!payout) return null;
                const num = Number(payout);
                return Number.isFinite(num) ? Math.round(num * 100) : null;
            })();

            // --- Update send_log with response -------------------------------
            await this.sendLogDAO.updateLog(log.id, {
                response_code: response.status,
                response_body: JSON.stringify(response.data),
                payout_cents: payoutCents,
                status: "sent"
            });

            // --- Mark lead as sent -------------------------------------------
            const updatedLead = await this.leadDAO.updateLead(lead.id, { sent: true });
            console.log(`Lead ${lead.id} sent successfully to ISpeedToLead.`);
            console.log('ISpeedToLead response:', response.data);
            console.log('Updated Lead:', updatedLead);
            return updatedLead;

        } catch (err: any) {

            // --- Mark lead as sent -------------------------------------------
            await this.leadDAO.updateLead(lead.id, { sent: true });
            const errorResponse = err.response?.data || err.message || "Unknown error";

            // --- Update send_log on failure ----------------------------------
            await this.sendLogDAO.updateLog(log.id, {
                response_code: err.response?.status ?? 0,
                response_body: JSON.stringify(errorResponse),
                payout_cents: null,
                status: "failed"
            });

            throw new Error(
                typeof errorResponse === "string"
                    ? errorResponse
                    : JSON.stringify(errorResponse)
            );
        }
    }

    async trashLead(leadId: string): Promise<Lead> {
        try {
            const lead = await this.leadDAO.getById(leadId);
            if (!lead) {
                throw new Error("Lead not found");
            }

            // Hard block: sent leads cannot be trashed
            if (lead.sent) {
                throw new Error("Lead already sent");
            }

            return await this.leadDAO.trashLead(leadId);

        } catch (error) {
            console.error("Error during lead trash process:", error);
            throw new Error(
                error instanceof Error ? error.message : "Failed to trash lead"
            );
        }
    }

    async getMany(filters: LeadFilters): Promise<{ leads: Lead[]; count: number }> {
        try {
            const { limit, page } = filters;
            return await this.leadDAO.getMany({ page, limit });
        } catch (error) {
            console.error('Error fetching leads:', error);
            throw new Error(`Failed to fetch leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async verifyLead(leadId: string): Promise<Lead> {
        // Fetch lead
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) throw new Error("Lead not found");
        if (lead.sent) throw new Error("Lead already sent");
        if (lead.verified) throw new Error("Lead is already verified");

        // Fetch form input
        const form = await this.leadFormInputDAO.getByLeadId(leadId);
        if (!form) throw new Error("Missing form for lead");

        // Required backend validation
        const REQUIRED_FIELDS = [
            "form_multifamily",
            "form_repairs",
            "form_occupied",
            "form_sell_fast",
            "form_goal",
            "form_owner",
            "form_owned_years",
            "form_listed"
        ];

        const formObj = form as unknown as Record<string, any>;

        const missing: string[] = REQUIRED_FIELDS.filter(
            f => !formObj[f] || String(formObj[f]).trim() === ""
        );

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        // Verify lead
        return await this.leadDAO.verifyLead(leadId);
    }

    async unverifyLead(leadId: string): Promise<Lead> {
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) throw new Error("Lead not found");
        if (lead.sent) throw new Error("Lead already sent");
        if (!lead.verified) throw new Error("Lead is not verified");

        return await this.leadDAO.unverifyLead(leadId);
    }

    async importLeads(csvContent: string) {
        const { leads, affiliates, campaigns, investors } = parseCsvToLeads(csvContent);

        const investorMap = await this.investorService.loadOrCreateInvestors(investors);
        const affiliateMap = await this.affiliateService.loadOrCreateAffiliates(affiliates);
        const campaignMap = await this.campaignService.loadOrCreateCampaigns(campaigns, affiliateMap);
        const countyMap = await this.countyService.loadOrCreateCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];

        for (const lead of leads) {
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);
            const investor = investorMap.get(lead.investor_id?.toLowerCase() || '');
            const campaign = campaignMap.get(lead.campaign_id?.toLowerCase() || '');

            if (!county || !investor || !campaign) continue;

            lead.county_id = county.id;
            lead.investor_id = investor.id;
            lead.campaign_id = campaign.id;

            resolvedLeads.push(lead);
        }

        // SETTINGS
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const delayMs = settings.delay_same_investor * 24 * 60 * 60 * 1000;

        // GET LOGS PER INVESTOR
        const investorIds = [...new Set(resolvedLeads.map(l => l.investor_id!))];
        const recentInvestorLogs = await this.sendLogDAO.getLatestLogsByInvestorIds(investorIds);

        // FILTER LEADS BASED ON DELAY
        const filteredLeads = resolvedLeads.filter(lead => {
            const log = recentInvestorLogs.find(l => l.investor_id === lead.investor_id);
            if (!log) return true;
            return Date.now() - new Date(log.created).getTime() > delayMs;
        });

        const insertResults = await this.leadDAO.createLeads(filteredLeads);

        const successCount = insertResults.filter(r => r.success).length;
        const failedCount = insertResults.length - successCount;

        return {
            imported: successCount,
            rejected: failedCount + (resolvedLeads.length - filteredLeads.length),
            errors: insertResults.filter(r => !r.success).map(r => r.error || "Unknown error")
        };
    }
}