import { injectable } from "tsyringe";
import CampaignDAO from "../data/campaignDAO";
import SourceDAO from "../data/sourceDAO";
import { Campaign, CampaignCreateDTO, CampaignUpdateDTO, CampaignFilters, ExternalCampaignData } from "../types/campaignTypes";

/**
 * CampaignService - Business logic for campaigns
 * TICKET-046: Updated to use sources instead of affiliates
 *
 * Campaign Names:
 * - Not unique across sources (same name can exist for different sources)
 * - Unique within a source (enforced at application level)
 * - If source changes campaign name, treated as new campaign (intentional for tracking)
 */
@injectable()
export default class CampaignService {
    constructor(
        private readonly campaignDAO: CampaignDAO,
        private readonly sourceDAO: SourceDAO
    ) {}

    /**
     * Get campaign by ID
     */
    async getById(id: string): Promise<Campaign | null> {
        try {
            return await this.campaignDAO.getById(id);
        } catch (error) {
            console.error("Error fetching campaign by ID:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch campaign ${id}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get campaign by name within a source
     */
    async getByName(sourceId: string, name: string): Promise<Campaign | null> {
        try {
            return await this.campaignDAO.getByName(sourceId, name);
        } catch (error) {
            console.error("Error fetching campaign by name:", {
                sourceId,
                name,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch campaign by name: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get all campaigns for a specific source
     * Updated from getByAffiliateId
     */
    async getBySourceId(sourceId: string): Promise<Campaign[]> {
        try {
            return await this.campaignDAO.getBySourceId(sourceId);
        } catch (error) {
            console.error("Error fetching campaigns for source:", {
                sourceId,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch campaigns for source ${sourceId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get all campaigns with pagination and filters
     */
    async getAll(filters: CampaignFilters): Promise<{ items: Campaign[]; count: number }> {
        try {
            return await this.campaignDAO.getAll(filters);
        } catch (error) {
            console.error("Error fetching campaigns:", {
                filters,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch campaigns: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Create a new campaign
     * Validates that source exists before creating
     */
    async create(data: CampaignCreateDTO): Promise<Campaign> {
        try {
            // Validate input
            if (!data.name || data.name.trim().length === 0) {
                throw new Error('Campaign name is required');
            }

            if (!data.source_id) {
                throw new Error('Source ID is required');
            }

            // Verify source exists
            const source = await this.sourceDAO.getById(data.source_id);
            if (!source) {
                throw new Error(`Source not found: ${data.source_id}`);
            }

            // Check if campaign with same name already exists for this source
            const existing = await this.campaignDAO.getByName(data.source_id, data.name);
            if (existing) {
                throw new Error(`Campaign '${data.name}' already exists for this source`);
            }

            // Create campaign
            const campaign = await this.campaignDAO.create(data);

            console.info('Created new campaign', {
                id: campaign.id,
                name: campaign.name,
                sourceId: campaign.source_id
            });

            return campaign;

        } catch (error) {
            console.error("Error creating campaign:", {
                data,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw error;  // Re-throw to preserve original error message
        }
    }

    /**
     * Update existing campaign
     */
    async update(id: string, data: CampaignUpdateDTO): Promise<Campaign> {
        try {
            // If updating name, check for duplicates within same source
            if (data.name) {
                const existing = await this.campaignDAO.getById(id);
                if (!existing) {
                    throw new Error(`Campaign not found: ${id}`);
                }

                const duplicate = await this.campaignDAO.getByName(existing.source_id, data.name);
                if (duplicate && duplicate.id !== id) {
                    throw new Error(`Campaign '${data.name}' already exists for this source`);
                }
            }

            const campaign = await this.campaignDAO.update(id, data);

            console.info('Updated campaign', {
                id: campaign.id,
                updatedFields: Object.keys(data)
            });

            return campaign;

        } catch (error) {
            console.error("Error updating campaign:", {
                id,
                data,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw error;  // Re-throw to preserve original error message
        }
    }

    /**
     * Soft delete campaign
     */
    async trash(id: string): Promise<Campaign> {
        try {
            const campaign = await this.campaignDAO.trash(id);

            console.info('Soft deleted campaign', {
                id: campaign.id,
                name: campaign.name
            });

            return campaign;

        } catch (error) {
            console.error("Error deleting campaign:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to delete campaign ${id}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get or create campaign by name within a source
     * Useful for API intake where campaign might not exist yet
     */
    async getOrCreate(sourceId: string, campaignName: string): Promise<Campaign> {
        try {
            // Verify source exists first
            const source = await this.sourceDAO.getById(sourceId);
            if (!source) {
                throw new Error(`Source not found: ${sourceId}`);
            }

            // Try to get or create
            const campaign = await this.campaignDAO.getOrCreate(sourceId, campaignName);

            if (campaign.created === campaign.modified) {
                console.info('Created new campaign via getOrCreate', {
                    id: campaign.id,
                    name: campaign.name,
                    sourceId: sourceId
                });
            }

            return campaign;

        } catch (error) {
            console.error("Error in getOrCreate campaign:", {
                sourceId,
                campaignName,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw error;  // Re-throw to preserve original error message
        }
    }

    /**
     * TICKET-047: Get or create campaign with external platform tracking
     * Tries to match by external_campaign_id first, falls back to name matching
     *
     * @param sourceId - Source ID
     * @param externalData - External campaign data from platform (Facebook, Google, etc.)
     * @param fallbackName - Internal campaign name (used if no external ID match)
     * @returns Existing or newly created campaign
     */
    async getOrCreateByExternal(
        sourceId: string,
        externalData: Partial<ExternalCampaignData>,
        fallbackName: string
    ): Promise<Campaign> {
        try {
            // Verify source exists first
            const source = await this.sourceDAO.getById(sourceId);
            if (!source) {
                throw new Error(`Source not found: ${sourceId}`);
            }

            // Use DAO method for matching/creation
            const campaign = await this.campaignDAO.getOrCreateByExternal(
                sourceId,
                externalData,
                fallbackName
            );

            if (campaign.created === campaign.modified) {
                console.info('Created new campaign with external tracking', {
                    id: campaign.id,
                    name: campaign.name,
                    platform: campaign.platform,
                    externalCampaignId: campaign.external_campaign_id,
                    sourceId: sourceId
                });
            } else if (externalData.external_campaign_id) {
                console.info('Matched existing campaign by external ID', {
                    id: campaign.id,
                    externalCampaignId: campaign.external_campaign_id
                });
            }

            return campaign;

        } catch (error) {
            console.error("Error in getOrCreateByExternal campaign:", {
                sourceId,
                externalData,
                fallbackName,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw error;  // Re-throw to preserve original error message
        }
    }

    /**
     * Legacy method - getManyByIds
     * Kept for backward compatibility
     */
    async getManyByIds(ids: string[]): Promise<Campaign[]> {
        return this.campaignDAO.getManyByIds(ids);
    }

    /**
     * Legacy method - updateCampaignMeta
     * Kept for backward compatibility
     */
    async updateCampaignMeta(id: string, updates: Partial<Pick<Campaign, 'rating' | 'blacklisted'>>): Promise<Campaign> {
        return this.update(id, updates);
    }
}
