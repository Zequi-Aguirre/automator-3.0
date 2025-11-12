export type Investor = {
    id: string;
    name: string;
    created?: string;
    modified?: string;
    deleted?: string | null;
};

export type CreateInvestorInput = {
    name: string;
};