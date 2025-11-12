import { BuyerLead } from "./buyerLeadTypes.ts";

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
    is_test: boolean;
    created: string;
    buyer_lead: BuyerLead | null;
    vendor_lead_id: string;
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