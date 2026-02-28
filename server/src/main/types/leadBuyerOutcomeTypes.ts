export type LeadBuyerOutcome = {
    id: string;
    lead_id: string;
    buyer_id: string;
    status: string;
    sold_at: string | null;
    sold_price: number | null;
    notes: string | null;
    allow_resell: boolean; // Captured at time of sale from buyer's setting
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
    allow_resell?: boolean; // Capture buyer's current allow_resell setting
};

export type OutcomeUpdateDTO = {
    status?: string;
    sold_at?: Date | null;
    sold_price?: number | null;
    notes?: string | null;
    allow_resell?: boolean; // Can update resell availability
};
