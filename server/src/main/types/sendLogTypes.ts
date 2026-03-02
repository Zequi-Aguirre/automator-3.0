export interface SendLog {
    id: string;
    lead_id: string;
    buyer_id: string;
    source_id: string | null;  // TICKET-046: Renamed from affiliate_id
    campaign_id: string | null;
    investor_id: string | null;
    county_id: string | null;

    status: "sent" | "failed";

    response_code: number | null;
    response_body: string | null;
    payout_cents: number | null;

    created: string;
    modified: string;
    deleted: string | null;

    // For joined queries
    buyer_name?: string;
    state?: string; // From leads join (for state cooldown queries)
}

export interface SendLogInsert {
    lead_id: string;
    buyer_id: string;
    source_id: string | null;  // TICKET-046: Renamed from affiliate_id
    campaign_id: string | null;
    status: "sent" | "failed";
}

export interface SendLogUpdate {
    response_code?: number;
    response_body?: string;
    payout_cents: number | null;
    status?: "sent" | "failed";
}