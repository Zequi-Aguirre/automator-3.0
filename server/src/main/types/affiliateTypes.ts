export type Affiliate = {
    id: string;
    name: string;
    created?: string;
    modified?: string;
    deleted?: string | null;
};

export type CreateAffiliateInput = {
    name: string;
};