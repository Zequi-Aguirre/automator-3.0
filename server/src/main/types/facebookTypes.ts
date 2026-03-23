// TICKET-143: Facebook Lead Ads types

export type FacebookLeadRecord = {
    id: string;
    fb_lead_id: string;
    fb_form_id: string | null;
    fb_form_name: string | null;
    fb_page_id: string | null;
    fb_ad_id: string | null;
    fb_ad_name: string | null;
    fb_adset_id: string | null;
    fb_adset_name: string | null;
    fb_campaign_id: string | null;
    fb_campaign_name: string | null;
    phone: string | null;
    phone_normalized: string | null;
    email: string | null;
    field_data: Array<{ name: string; values: string[] }>;
    source_id: string | null;
    automator_campaign_id: string | null;
    automator_lead_id: string | null;
    match_status: 'pending' | 'matched' | 'unmatched';
    fb_created_time: Date | null;
    synced_at: Date;
};

// Shape of a single lead from the Facebook Graph API
export type FacebookApiLead = {
    id: string;
    created_time: string;
    field_data: Array<{ name: string; values: string[] }>;
    ad_id?: string;
    ad_name?: string;
    adset_id?: string;
    adset_name?: string;
    campaign_id?: string;
    campaign_name?: string;
    form_id?: string;
};

// Shape of a Facebook webhook event entry
export type FacebookWebhookEntry = {
    id: string;       // page ID
    time: number;
    changes: Array<{
        field: string;
        value: {
            leadgen_id: string;
            page_id: string;
            form_id: string;
            ad_id?: string;
            adgroup_id?: string;  // adset_id
        };
    }>;
};
