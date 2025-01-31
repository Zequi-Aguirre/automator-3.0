export type BuyerLead = {
    buyer_id: string | null;
    campaign_id: string;
    company_name: string | null;
    error_message: string | null;
    id: string;
    lead_id: string;
    payout: string | null;
    ping_date: Date | null;
    ping_id: string | null;
    ping_message: string | null;
    ping_result: string | null;
    post_date: Date | null;
    post_message: string | null;
    post_result: string | null;
    sent_by_user_id: string | null;
    status: string | null;
};

// Define the allowed fields for updates
export type BuyerLeadUpdateAllowedFieldsType = {
    ping_id: string | null;
    payout: string | null;
    status: string | null;
    ping_result: string | null;
    ping_message: string | null;
    ping_date: Date | null;
    error_message: string | null;
    company_name: string | null;
    sent_by_user_id: string | null;
    post_result: string | null;
    post_message: string | null;
    post_date: Date | null;
};

// Define the allowed fields for creating a BuyerLead
export type BuyerLeadCreateAllowedFieldsType = {
    buyer_id: string | null;
    campaign_id: string;
    company_name: string | null;
    error_message: string | null;
    lead_id: string;
    payout: string | null;
    ping_date: Date | null;
    ping_id: string;
    ping_message: string | null;
    ping_result: string | null;
    post_date: Date | null;
    post_message: string | null;
    post_result: string | null;
    sent_by_user_id: string | null;
    status: string;
};