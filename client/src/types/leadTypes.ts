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
    imported_at: string;
    sent_date: string | null;
    sent: boolean;
    verified: boolean;
}