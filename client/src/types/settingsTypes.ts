export type WorkerSettings = {
    id: string;
    name: string;
    send_next_lead_at: Date | null;
    last_worker_run: Date | null;
    minutes_range_start: number | null;
    minutes_range_end: number | null;
    business_hours_start: string;
    business_hours_end: string;
    delay_same_county: number;
    delay_same_state: number;
    min_delay: number;
    max_delay: number;
    getting_leads: boolean;
    pause_app: boolean;
    counties_on_hold: string[];
    states_on_hold: string[];
    created: Date;
    modified: Date;
    deleted: Date | null;
};

export type EnvironmentSettings = {
    id: string;
    allow_login: boolean;
    created: Date;
    modified: Date;
    deleted: Date | null;
};
