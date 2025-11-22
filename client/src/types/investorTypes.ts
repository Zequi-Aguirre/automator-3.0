export type Investor = {
    id: string;
    name: string;
    blacklisted: boolean;
    whitelisted: boolean;
    rating: number;
    created?: string;
    modified?: string;
    deleted?: string | null;
};