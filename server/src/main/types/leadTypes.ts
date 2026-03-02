export type Lead = {
    id: string;
    address: string;
    city: string;
    state: string;
    county: string;
    county_id: string;
    zipcode: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    created: string;
    sent: boolean;
    verified: boolean;
    sent_date: string;
    private_notes: string | null;
    investor_id: string | null;
    campaign_id: string | null;
    worker_enabled: boolean;
    // TICKET-047: External platform tracking
    external_lead_id: string | null;  // Platform's lead ID (e.g., Facebook leadgenId)
    external_ad_id: string | null;  // Platform's ad ID
    external_ad_name: string | null;  // Platform's ad name
    raw_payload: Record<string, any> | null;  // Complete original platform payload
}

export type LeadUpdateAllowedFieldsType = {
    address: string;
    city: string;
    state: string;
    zipcode: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
};

export type LeadFilters = {
    page: number;
    limit: number;
    search?: string;
    status?: "new" | "verified" | "sent" | "trash";
};

export type FlatLead = {
    id: string;
    address: string;
    city: string;
    state: string;
    county: string | null;
    county_id: string;
    zipcode: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    is_test: boolean;
    created: Date;
    modified: Date;
    deleted: Date | null;
    zb_id: string | null;
    vendor_lead_id: string | null;
    'buyer_lead.id': string | null;
    'buyer_lead.buyer_id': string | null;
    'buyer_lead.campaign_id': string | null;
    'buyer_lead.company_name': string | null;
    'buyer_lead.error_message': string | null;
    'buyer_lead.payout': number | null;
    'buyer_lead.ping_date': Date | null;
    'buyer_lead.ping_id': string | null;
    'buyer_lead.ping_message': string | null;
    'buyer_lead.ping_result': string | null;
    'buyer_lead.post_date': Date | null;
    'buyer_lead.post_message': string | null;
    'buyer_lead.post_result': string | null;
    'buyer_lead.sent_by_user_id': string | null;
    'buyer_lead.status': string | null;
};

/**
 * ExternalLeadMetadata - External platform tracking metadata
 * TICKET-047: Stores platform-specific lead tracking data
 */
export type ExternalLeadMetadata = {
    external_lead_id?: string;  // Platform's lead ID (e.g., Facebook leadgenId)
    external_ad_id?: string;  // Platform's ad ID
    external_ad_name?: string;  // Platform's ad name
    page_id?: string;  // Facebook page ID
    inbox_url?: string;  // Facebook inbox URL
    date_created?: string;  // Platform's creation timestamp
    is_organic?: boolean;  // Organic vs paid
    [key: string]: any;  // Allow additional platform-specific fields
};

/**
 * ApiLeadPayload - Lead data from API intake
 * TICKET-047: Updated to support new structured format with external tracking
 *
 * Supports two formats:
 * 1. NEW (preferred): Structured with lead/campaign/metadata/raw_payload
 * 2. LEGACY: Flat structure with campaign_name (backwards compatible)
 */
export type ApiLeadPayload = {
    // NEW FORMAT: Structured lead data
    lead?: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        county?: string;  // Optional - can be looked up by zip
    };
    campaign?: {
        platform: string;  // 'fb', 'google', 'tiktok', etc.
        external_campaign_id: string;
        external_campaign_name?: string;
        external_form_id?: string;
        external_adset_id?: string;
        external_adset_name?: string;
    };
    metadata?: ExternalLeadMetadata;
    raw_payload?: Record<string, any>;

    // LEGACY FORMAT: Flat structure (backwards compatible)
    campaign_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    county?: string;
    private_note?: string;
    sell_timeline?: string;
    repairs_needed?: string;
    sell_motivation?: string;

    // Allow additional fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

export type parsedLeadFromCSV = {
    name: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    county: string;
    county_id?: string;
    private_notes?: string | null;
    investor_id?: string | null;  // Deprecated - kept for backward compatibility
    source_id?: string | null;  // TICKET-046: Lead source (for API intake)
    campaign_id?: string | null;  // TICKET-046: Campaign (for API intake)
    // TICKET-047: External platform tracking
    external_lead_id?: string | null;
    external_ad_id?: string | null;
    external_ad_name?: string | null;
    raw_payload?: Record<string, any> | null;
};