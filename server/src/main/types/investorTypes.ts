export type Investor = {
    id: string;
    name: string;
    blacklisted: boolean;
    whitelisted: boolean;
    created?: string;
    modified?: string;
    deleted?: string | null;
};