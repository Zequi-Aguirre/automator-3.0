export type WorkerSettings = {
    id: string;
    name: string;
    send_next_lead_at: Date;
    last_worker_run: string;
    minutes_range_start: number;
    minutes_range_end: number;
    business_hours_start: number;
    business_hours_end: number;
    delay_same_county: number;
    delay_same_state: number;
    min_delay: number;
    max_delay: number;
    getting_leads: boolean;
    pause_app: boolean;
    counties_on_hold: string[];
    states_on_hold: string[];
    created: string | null;
    modified: string | null;
    deleted: string | null;
};

export type WorkerSettingsUpdateAllowedFieldsType = {
    name: string;
    send_next_lead_at: Date | null;
    minutes_range_start: number | null;
    minutes_range_end: number | null;
    business_hours_start: number | null;
    business_hours_end: number | null;
    delay_same_state: number | null;
    states_on_hold: string[];
};

export type EnvSettings = {
    id: string;
    name: string;
    allow_login: boolean;
    created: Date;
    modified: Date;
    deleted: Date | null;
};

export type EnvSettingsUpdateAllowedFieldsType = {
    name: string;
    allow_login: boolean;
};


export type AllowedOrigin = {
    url: string;
    allowed: boolean;
    admin_view: boolean;
    allow_login: boolean; // TODO: this is not implemented but it is in the DB
    created: string | null;
    modified: string | null;
    deleted: string | null;
};

export type LandingPages = {
    id: string;
    name: string;
    url: string;
    campaign_id: string;
    created: string | null;
    modified: string | null;
    deleted: string | null;
};
