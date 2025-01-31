export type PingResponse = {
    result: string;
    message: string;
    company_name: string;
    ping_id: string;
    state: string;
    county: string;
    payout: string;
    duplicate: boolean;
}

export type PostResponse = {
    result: string;
    lead_id: string;
    county: string;
    buyer: string;
    state: string;
    message: string;
    reason: string;
    payout: string;
}