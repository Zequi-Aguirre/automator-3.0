import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { Lead, LeadFilters } from "../types/leadTypes";
import { parseCsvToLeads } from "../middleware/parseCsvToLeads.ts";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";
import CountyService from "../services/countyService.ts";
import CampaignService from "../services/campaignService.ts";
import AffiliateService from "../services/affiliateService.ts";
import InvestorService from "../services/investorService.ts";

@injectable()
export default class LeadService {

    constructor(
        private readonly leadDAO: LeadDAO,
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
            return await this.leadDAO.trashLead(leadId);
        } catch (error) {
            console.error('Error during lead trash process:', error);
            throw new Error(`Failed to trash lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    async importLeads(csvContent: string) {
        console.log('Starting CSV import...');

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