export type Platform = 'sellers' | 'compass' | 'pickle';

export type PlatformImportBatch = {
    id: number;
    platform: string;
    filename: string | null;
    row_count: number | null;
    imported_by: string | null;
    imported_at: string;
};

export type PlatformLeadRecord = {
    id: number;
    import_batch_id: number;
    platform: string;
    platform_lead_id: string | null;
    platform_buyer_lead_id: string;
    platform_buyer_id: string | null;
    platform_buyer_name: string | null;
    platform_buyer_email: string | null;
    platform_buyer_products: string[];
    phone: string | null;
    phone_normalized: string | null;
    email: string | null;
    campaign_name: string | null;
    import_note: string | null;
    received_at: string | null;
    sent_out_at: string | null;
    buyer_lead_created_at: string | null;
    buyer_lead_status: string | null;
    buyer_confirmed: boolean | null;
    price_cents: number | null;
    disputed: boolean;
    dispute_reason: string | null;
    dispute_status: string | null;
    dispute_date: string | null;
    disputed_at: string | null;
    automator_lead_id: string | null;
    automator_send_log_id: string | null;
    automator_buyer_id: string | null;
    match_status: string;
    created: string;
    last_imported_at: string;
};

export type PlatformBuyerMapping = {
    id: number;
    platform: string;
    platform_buyer_id: string;
    platform_buyer_name: string | null;
    automator_buyer_id: string | null;
    mapped_by: string | null;
    mapped_at: string;
};

// Unique platform buyer detected in a CSV file
export type PlatformBuyerSummary = {
    platform_buyer_id: string;
    platform_buyer_name: string | null;
    platform_buyer_email: string | null;
    platform_buyer_products: string[];
    row_count: number;
    saved_automator_buyer_id: string | null; // pre-filled from previous import
};

export type BuyerMapping = {
    platform_buyer_id: string;
    automator_buyer_id: string | null; // null = skip / unknown
};

export type PreviewResult = {
    row_count: number;
    platform_buyers: PlatformBuyerSummary[];
    file_token: string;
};

export type ConfirmImportDTO = {
    platform: Platform;
    file_token: string;
    buyer_mappings: BuyerMapping[];
};

export type ImportResult = {
    batch_id: number;
    row_count: number;
};

// Internal: parsed CSV row before DB insert
export type ParsedPlatformRow = {
    platform: string;
    platform_lead_id: string | null;
    platform_buyer_lead_id: string;
    platform_buyer_id: string | null;
    platform_buyer_name: string | null;
    platform_buyer_email: string | null;
    platform_buyer_products: string[];
    phone: string | null;
    phone_normalized: string | null;
    email: string | null;
    campaign_name: string | null;
    import_note: string | null;
    received_at: string | null;
    sent_out_at: string | null;
    buyer_lead_created_at: string | null;
    buyer_lead_status: string | null;
    buyer_confirmed: boolean | null;
    price_cents: number | null;
    disputed: boolean;
    dispute_reason: string | null;
    dispute_status: string | null;
    dispute_date: string | null;
    disputed_at: string | null;
    automator_buyer_id: string | null;
};
