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
    private_notes: string | null;
    investor_id: string | null;
    campaign_id: string | null;
    worker_enabled: boolean;
}