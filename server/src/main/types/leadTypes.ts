export type Lead = {
    id: string;
    address: string;
    city: string;
    state: string;
    county: string;
    county_id: string;
    zipcode: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    created: string;
    sent: boolean;
    verified: boolean;
    sent_date: string;
    private_notes: string | null;
    investor_id: string | null;
}

export type LeadUpdateAllowedFieldsType = {
    address: string;
    city: string;
    state: string;
    zipcode: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
};

export type LeadFilters = {
    page: number;
    limit: number;
    search?: string;
    status?: "new" | "verified" | "sent" | "trash";
};

export type FlatLead = {
    id: string;
    address: string;
    city: string;
    state: string;
    county: string | null;
    county_id: string;
    zipcode: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    is_test: boolean;
    created: Date;
    modified: Date;
    deleted: Date | null;
    zb_id: string | null;
    vendor_lead_id: string | null;
    'buyer_lead.id': string | null;
    'buyer_lead.buyer_id': string | null;
    'buyer_lead.campaign_id': string | null;
    'buyer_lead.company_name': string | null;
    'buyer_lead.error_message': string | null;
    'buyer_lead.payout': number | null;
    'buyer_lead.ping_date': Date | null;
    'buyer_lead.ping_id': string | null;
    'buyer_lead.ping_message': string | null;
    'buyer_lead.ping_result': string | null;
    'buyer_lead.post_date': Date | null;
    'buyer_lead.post_message': string | null;
    'buyer_lead.post_result': string | null;
    'buyer_lead.sent_by_user_id': string | null;
    'buyer_lead.status': string | null;
};

export type parsedLeadFromCSV = {
    name: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    county: string;
    county_id?: string;
    private_notes?: string | null;
    investor_id?: string | null;
};