export interface ISpeedToLeadResponse {
    result?: string;
    lead_id?: string;
    county?: string;
    buyer?: string;
    state?: string;
    message?: string;
    reason?: string;
    payout?: string | number | null;
    [key: string]: any; // because their API is inconsistent
}