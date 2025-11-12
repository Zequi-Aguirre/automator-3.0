import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { Lead, LeadFilters } from "../types/leadTypes";
import { parseCsvToLeads } from "../middleware/parseCsvToLeads.ts";
import { County } from "../types/countyType.ts";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";
import CountyDAO from "../data/countyDAO.ts";

@injectable()
export default class LeadService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly countyDAO: CountyDAO
    ) {
    }

    // Lead Management Methods
    async getLeadById(leadId: string): Promise<Lead | null> {
        try {
            // For PostgreSQL operations, use the existing implementation
            return await this.leadDAO.getById(leadId);
        } catch (error) {
            // Provide detailed error logging while maintaining security
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

    // services/leadService.ts
    async trashLead(leadId: string): Promise<Lead> {
        try {
            // If using new database, proceed normally
                return await this.leadDAO.trashLead(leadId);
        } catch (error) {
            console.error('Error during lead trash process:', error);
            throw new Error(`Failed to trash lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getMany(filters: LeadFilters): Promise<{ leads: Lead[]; count: number }> {
        try {
            const { limit, page } = filters
            return await this.leadDAO.getMany({ page, limit });
        } catch (error) {
            console.error('Error fetching leads:', error);
            throw new Error(`Failed to fetch leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async importLeads(csvContent: string) {
        console.log('Starting CSV import...');

        // 1. Parse CSV into leads, affiliates, and campaigns
        const { leads, affiliates, campaigns } = parseCsvToLeads(csvContent);
        console.log(`Parsed ${leads.length} leads`);
        console.log(`Detected ${affiliates.size} affiliates, ${campaigns.size} campaigns`);

        // 2. Fetch existing counties
        const existingCounties = await this.countyDAO.getAllCounties();
        const countyMap = new Map<string, County>();

        // Build map from normalized key: `${name.toLowerCase()}_${state.toLowerCase()}`
        for (const county of existingCounties) {
            const key = `${county.name.toLowerCase()}_${county.state.toLowerCase()}`;
            countyMap.set(key, county);
        }

        // 3. Resolve counties: reuse existing or insert new ones
        const resolvedLeads: parsedLeadFromCSV[] = [];
        for (const lead of leads) {
            const county_key = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            let county = countyMap.get(county_key);

            if (!county) {
                // Insert new county if not found
                county = await this.countyDAO.insertCounty({
                    name: lead.county,
                    state: lead.state,
                    population: null,
                    timezone: null
                });

                countyMap.set(county_key, county); // cache it for next loop
            }

            lead.county_id = county.id;
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