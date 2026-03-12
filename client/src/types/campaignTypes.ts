/**
 * Campaign Types - Source Campaign Tracking
 * TICKET-046: Campaigns belong to sources and track marketing campaigns
 * TICKET-047: External platform tracking for Facebook, Google, TikTok, etc.
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
    // TICKET-047: External platform tracking
    platform: string | null;  // 'fb', 'google', 'tiktok', etc.
    external_campaign_id: string | null;  // Platform's campaign ID
    external_campaign_name: string | null;  // Platform's campaign name (may differ from our name)
    external_form_id: string | null;  // Platform's form ID (Facebook Lead Ads)
    external_adset_id: string | null;  // Platform's ad set ID
    external_adset_name: string | null;  // Platform's ad set name
    lead_manager_id: string | null;
    created: string;  // ISO timestamp
    modified: string;  // ISO timestamp
    deleted: string | null;  // Soft delete timestamp
};

/**
 * ExternalCampaignData - External platform tracking data
 * TICKET-047: Used for campaign matching and auto-creation
 */
export type ExternalCampaignData = {
    platform: string;  // 'fb', 'google', 'tiktok', etc.
    external_campaign_id: string;
    external_campaign_name?: string;
    external_form_id?: string;
    external_adset_id?: string;
    external_adset_name?: string;
};

/**
 * CampaignCreateDTO - Data for creating new campaign
 */
export type CampaignCreateDTO = {
    source_id: string;
    name: string;
    blacklisted?: boolean;  // Default false
    rating?: number;  // Default 3 (CHECK constraint requires 1-5)
    // TICKET-047: Optional external tracking data
    platform?: string;
    external_campaign_id?: string;
    external_campaign_name?: string;
    external_form_id?: string;
    external_adset_id?: string;
    external_adset_name?: string;
};

/**
 * CampaignUpdateDTO - Data for updating existing campaign
 * All fields optional
 */
export type CampaignUpdateDTO = {
    name?: string;
    blacklisted?: boolean;
    rating?: number;
    lead_manager_id?: string | null;
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
