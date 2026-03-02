/**
 * Campaign Types - Source Campaign Tracking
 * TICKET-046: Campaigns belong to sources and track marketing campaigns
 */

/**
 * Campaign - Database entity
 * Represents a marketing campaign under a source
 */
export type Campaign = {
    id: string;
    source_id: string;  // Foreign key to sources table
    name: string;
    blacklisted: boolean;
    rating: number;
    created: string;  // ISO timestamp
    modified: string;  // ISO timestamp
    deleted: string | null;  // Soft delete timestamp
};

/**
 * CampaignCreateDTO - Data for creating new campaign
 */
export type CampaignCreateDTO = {
    source_id: string;
    name: string;
    blacklisted?: boolean;  // Default false
    rating?: number;  // Default 3 (CHECK constraint requires 1-5)
};

/**
 * CampaignUpdateDTO - Data for updating existing campaign
 * All fields optional
 */
export type CampaignUpdateDTO = {
    name?: string;
    blacklisted?: boolean;
    rating?: number;
};

/**
 * CampaignFilters - Query filters for listing campaigns
 */
export type CampaignFilters = {
    page: number;
    limit: number;
    source_id?: string;  // Filter by source
    search?: string;  // Search by name
    includeDeleted?: boolean;  // Include soft-deleted campaigns
};