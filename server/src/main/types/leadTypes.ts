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
    verified: boolean;
    investor_id: string | null;
    campaign_id: string | null;
    source_id: string | null;
    source_name: string | null;
    queued: boolean;
    deleted: string | null;
    deleted_reason: string | null;
    campaign_name: string | null;
    campaign_platform: string | null;
    // TICKET-047: External platform tracking
    external_lead_id: string | null; // Platform's lead ID (e.g., Facebook leadgenId)
    external_ad_id: string | null; // Platform's ad ID
    external_ad_name: string | null; // Platform's ad name
    raw_payload: Record<string, unknown> | null; // Complete original platform payload
    // TICKET-064: Needs review stage (missing required fields at import)
    needs_review: boolean;
    needs_review_reason: string | null;
    // TICKET-065: Needs call stage and call tracking
    needs_call: boolean;
    call_reason: string | null;
    call_requested_at: string | null;
    call_requested_by: string | null;
    call_executed_at: string | null;
    call_executed_by: string | null;
    call_outcome: string | null;
    call_outcome_notes: string | null;
    call_attempts: number;
    // TICKET-152: Dynamic custom fields — keyed by field key (e.g. { time_to_sell: "ASAP" })
    custom_fields: Record<string, unknown> | null;
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
    status?: "needs_review" | "needs_call" | "new" | "verified" | "sent" | "sold" | "trash";
    // TICKET-066: Sent tab advanced filters (only applied when status === "sent")
    buyer_id?: string;
    send_source?: "manual" | "worker" | "auto_send";
    source_id?: string;
    campaign_id?: string;
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
    external_lead_id?: string; // Platform's lead ID (e.g., Facebook leadgenId)
    external_ad_id?: string; // Platform's ad ID
    external_ad_name?: string; // Platform's ad name
    page_id?: string; // Facebook page ID
    inbox_url?: string; // Facebook inbox URL
    date_created?: string; // Platform's creation timestamp
    is_organic?: boolean; // Organic vs paid
    [key: string]: unknown; // Allow additional platform-specific fields
};

/**
 * ApiLeadPayload - Lead data from API intake
 */
export type ApiLeadPayload = {
    lead: {
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        county?: string; // Optional - looked up by zip if not provided
    };
    campaign?: {
        platform?: string; // 'fb', 'google', 'tiktok', etc.
        external_campaign_id?: string;
        external_campaign_name?: string;
        external_form_id?: string;
        external_adset_id?: string;
        external_adset_name?: string;
    };
    metadata?: ExternalLeadMetadata;
    raw_payload?: Record<string, unknown>;
    // TICKET-152: Dynamic custom fields from external source
    custom_fields?: Record<string, unknown>;
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
    investor_id?: string | null; // Deprecated - kept for backward compatibility
    source_id?: string | null; // TICKET-046: Lead source (for API intake)
    campaign_id?: string | null; // TICKET-046: Campaign (for API intake)
    // TICKET-047: External platform tracking
    external_lead_id?: string | null;
    external_ad_id?: string | null;
    external_ad_name?: string | null;
    raw_payload?: Record<string, unknown> | null;
    // TICKET-064: Needs review flag (set before insert if required fields are missing)
    needs_review?: boolean;
    needs_review_reason?: string | null;
    // TICKET-152: Dynamic custom fields
    custom_fields?: Record<string, unknown> | null;
};