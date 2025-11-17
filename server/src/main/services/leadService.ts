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

@injectable()
export default class LeadService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadFormInputDAO: LeadFormInputDAO,
        private readonly countyService: CountyService,
        private readonly campaignService: CampaignService,
        private readonly affiliateService: AffiliateService,
        private readonly investorService: InvestorService
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
        // 1. Parse CSV into leads, affiliates, campaigns, and investors
        const { leads, affiliates, campaigns, investors } = parseCsvToLeads(csvContent);

        // 2. Resolve IDs and maps for all associated entities
        const investorMap = await this.investorService.loadOrCreateInvestors(investors);
        const affiliateMap = await this.affiliateService.loadOrCreateAffiliates(affiliates);
        const campaignMap = await this.campaignService.loadOrCreateCampaigns(campaigns, affiliateMap);
        const countyMap = await this.countyService.loadOrCreateCounties(leads);

        // 3. Enrich leads with foreign keys
        const resolvedLeads: parsedLeadFromCSV[] = [];
        for (const lead of leads) {
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);
            const investor = investorMap.get(lead.investor_id?.toLowerCase() || '');
            const campaign = campaignMap.get(lead.campaign_id?.toLowerCase() || '');

            if (!county || !investor || !campaign) {
                console.warn('Missing related entity for lead:', lead);
                continue; // skip this lead
            }

            lead.county_id = county.id;
            lead.investor_id = investor.id;
            lead.campaign_id = campaign.id;
            resolvedLeads.push(lead);
        }

        // 4. Insert leads
        const insertResults = await this.leadDAO.createLeads(resolvedLeads);
        const successCount = insertResults.filter(r => r.success).length;
        const failedCount = insertResults.length - successCount;

        return {
            imported: successCount,
            rejected: failedCount,
            errors: insertResults.filter(r => !r.success).map(r => r.error || "Unknown error")
        };
    }
}