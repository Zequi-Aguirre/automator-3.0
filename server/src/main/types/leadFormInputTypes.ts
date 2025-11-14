export interface LeadFormInput {
    id: string;
    lead_id: string;
    form_unit: string | null;
    form_multifamily: string | null;
    form_square: string | null;
    form_year: string | null;
    form_garage: string | null;
    form_bedrooms: string | null;
    form_bathrooms: string | null;
    form_repairs: string | null;
    form_occupied: string | null;
    form_sell_fast: string | null;
    form_goal: string | null;
    form_goal2: string | null;
    form_call_time: string | null;
    form_owner: string | null;
    form_owned_years: string | null;
    form_listed: string | null;
    form_scenario: string | null;
    form_source: string | null;
    activeprospect_certificate_url: string | null;
    record_link: string | null;
    last_post_status: string | null;
    last_post_payload: string | null;
    last_post_at: Date | null;
    created: Date;
    modified: Date;
    deleted: Date | null;
}

export interface LeadFormInputCreate {
    lead_id: string;
    form_unit?: string | null;
    form_multifamily?: string | null;
    form_square?: string | null;
    form_year?: string | null;
    form_garage?: string | null;
    form_bedrooms?: string | null;
    form_bathrooms?: string | null;
    form_repairs?: string | null;
    form_occupied?: string | null;
    form_sell_fast?: string | null;
    form_goal?: string | null;
    form_goal2?: string | null;
    form_call_time?: string | null;
    form_owner?: string | null;
    form_owned_years?: string | null;
    form_listed?: string | null;
    form_scenario?: string | null;
    form_source?: string | null;
    activeprospect_certificate_url?: string | null;
    record_link?: string | null;
    last_post_status?: string | null;
    last_post_payload?: string | null;
    last_post_at?: Date | null;
}

export type LeadFormInputUpdate = Omit<LeadFormInputCreate, 'lead_id'>;