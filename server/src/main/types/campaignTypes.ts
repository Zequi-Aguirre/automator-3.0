// types/campaignTypes.ts
export type Campaign = {
    id: string;
    external_id: string;
    name: string;
    is_active: boolean;
    created: string;
    modified: string;
    deleted: string | null;
};