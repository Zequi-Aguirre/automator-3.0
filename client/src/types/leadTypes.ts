import { BuyerLead } from "./buyerLeadTypes.ts";

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
    is_test: boolean;
    created: string;
    buyer_lead: BuyerLead | null;
}