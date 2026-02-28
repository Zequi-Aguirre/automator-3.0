export type LeadBuyerOutcome = {
    id: string;
    lead_id: string;
    buyer_id: string;
    status: string;
    sold_at: string | null;
    sold_price: number | null;
    notes: string | null;
    created: string;
    modified: string;
    deleted: string | null;
};

export type OutcomeCreateDTO = {
    lead_id: string;
    buyer_id: string;
    status?: string;
    sold_at?: Date | null;
    sold_price?: number | null;
    notes?: string | null;
};

export type OutcomeUpdateDTO = {
    status?: string;
    sold_at?: Date | null;
    sold_price?: number | null;
    notes?: string | null;
};
