export interface SendLog {
    id: string;
    lead_id: string;
    buyer_id: string | null;
    source_id: string | null;
    campaign_id: string | null;

    status: "sent" | "failed";

    response_code: number | null;
    response_body: string | null;
    payout_cents: number | null;

    disputed: boolean;
    dispute_reason: string | null;
    dispute_buyer_name: string | null;
    disputed_at: string | null;
    disputed_by: string | null;

    created: string;
    modified: string;
    deleted: string | null;

    // Joined display fields
    lead_first_name?: string;
    lead_last_name?: string;
    lead_county?: string | null;
    lead_state?: string | null;
    campaign_name?: string | null;
    campaign_platform?: string | null;
    buyer_name?: string | null;
}

export interface SendLogInsert {
    lead_id: string;
    buyer_id: string;
    source_id: string | null;
    campaign_id: string | null;
    status: "sent" | "failed";
}

export interface SendLogUpdate {
    response_code?: number;
    response_body?: string;
    payout_cents: number | null;
    status?: "sent" | "failed";
}
