export type SourceBuyerFilterMode = 'include' | 'exclude';

export type Source = {
    id: string;
    token?: string;  // Only present in CreateSourceResponse
    name: string;
    lead_manager_id: string | null;
    lead_manager_name?: string | null;
    campaign_count?: number;
    buyer_filter_mode: SourceBuyerFilterMode | null;
    buyer_filter_buyer_ids: string[];
    // TICKET-143: Facebook Lead Ads
    fb_page_id: string | null;
    fb_page_token: string | null;
    created: string;
    modified: string;
    deleted: string | null;
};

export type SourceFilterUpdateDTO = {
    mode: SourceBuyerFilterMode | null;
    buyer_ids: string[];
};

export type SourceCreateDTO = {
    name: string;
};

export type SourceUpdateDTO = {
    name?: string;
    lead_manager_id?: string | null;
    // TICKET-143: Facebook Lead Ads
    fb_page_id?: string | null;
    fb_page_token?: string | null;
};

export type SourceResponse = {
    id: string;
    name: string;
    created: string;
    modified: string;
    deleted: string | null;
};

export type CreateSourceResponse = SourceResponse & {
    token: string;  // Only returned once on create
};

export type RefreshTokenResponse = {
    id: string;
    token: string;
};
