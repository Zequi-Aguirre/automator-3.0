export type Lead = {
    id: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    county: string | null;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    created: string;
    sent_date: string | null;
    sent: boolean;
    verified: boolean;
    investor_id: string | null;
    campaign_id: string | null;
    queued: boolean;
    deleted: string | null;
    deleted_reason: string | null;
    campaign_name: string | null;
    campaign_platform: string | null;
}