import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { Lead, LeadFilters } from "../types/leadTypes";
import { EnvConfig } from "../config/envConfig.ts";

@injectable()
export default class LeadService {
    private readonly isTestEnvironment: boolean;

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly config: EnvConfig
    ) {
        this.config = config;
        this.isTestEnvironment = this.config.environment === 'local' || this.config.environment === 'staging';
    }

    // Lead Management Methods
    async getLeadById(leadId: string): Promise<Lead | null> {
        try {
            // For PostgreSQL operations, use the existing implementation
            const pgLead = await this.leadDAO.getById(leadId);

            // Log successful PostgreSQL retrievals in test environments
            if (this.isTestEnvironment && pgLead) {
                console.log('Successfully retrieved lead from PostgreSQL:', {
                    id: pgLead.id,
                    state: pgLead.state,
                    city: pgLead.city
                });
            }

            return pgLead;
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
            const page = Math.max(1, filters.page || 1);
            const limit = Math.max(1, Math.min(filters.limit || 10, 100));
            // Always perform PostgreSQL operations normally
            return await this.leadDAO.getMany({ page, limit });
        } catch (error) {
            console.error('Error fetching leads:', error);
            throw new Error(`Failed to fetch leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async importLeads(csvContent: string) {
        console.log('Received CSV content in LeadService:');
        console.log(csvContent.substring(0, 500)); // show only first 500 chars to avoid flooding logs
        return {
            imported: 0,
            rejected: 0,
            message: 'CSV received and logged successfully.'
        };
    }
}