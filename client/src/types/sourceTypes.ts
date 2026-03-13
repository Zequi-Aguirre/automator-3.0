export type Source = {
    id: string;
    token?: string;  // Only present in CreateSourceResponse
    name: string;
    lead_manager_id: string | null;
    lead_manager_name?: string | null;
    campaign_count?: number;
    created: string;
    modified: string;
    deleted: string | null;
};

export type SourceCreateDTO = {
    name: string;
};

export type SourceUpdateDTO = {
    name?: string;
    lead_manager_id?: string | null;
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
