export interface SendLog {
    id: string;
    lead_id: string;
    buyer_id: string | null;
    affiliate_id: string | null;
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
}

export interface SendLogInsert {
    lead_id: string;
    buyer_id?: string | null;
    affiliate_id: string | null;
    campaign_id: string | null;
    investor_id: string | null;
    status: "sent" | "failed";
}

export interface SendLogUpdate {
    response_code?: number;
    response_body?: string;
    payout_cents: number | null;
    status?: "sent" | "failed";
}