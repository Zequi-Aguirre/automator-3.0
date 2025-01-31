// types/campaignTypes.ts
export type Campaign = {
    id: string;
    external_id: string | null;
    name: string | null;
    is_active: boolean;
    created: string;
    modified: string;
    deleted: string | null;
};