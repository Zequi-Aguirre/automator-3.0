export interface SendLog {
    id: string;
    lead_id: string;
    affiliate_id: string | null;
    campaign_id: string | null;
    county_id?: string | null; // joined from leads table in county log queries

    status: "sent" | "failed";

    response_code: number | null;
    response_body: string | null;
    payout_cents: number | null;

    created: string;
    modified: string;
    deleted: string | null;
}

export interface SendLogInsert {
    lead_id: string;
    affiliate_id: string | null;
    campaign_id: string | null;
    status: "sent" | "failed";
}

export interface SendLogUpdate {
    response_code?: number;
    response_body?: string;
    payout_cents: number | null;
    status?: "sent" | "failed";
}