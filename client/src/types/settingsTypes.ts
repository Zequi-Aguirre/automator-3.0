export type WorkerSettings = {
    id: string;
    name: string;
    business_hours_start: number;
    business_hours_end: number;
    minutes_range_start: number;
    minutes_range_end: number;
    delay_same_state: number;
    delay_same_county: number;
    delay_same_investor: number;
    min_delay: number;
    max_delay: number;
    states_on_hold: string[];
    send_next_lead_at: string | null;
    last_worker_run: string;
    created: Date;
    modified: Date;
    deleted: Date | null;
};

// Subset of settings that can be edited from the UI
export type EditableWorkerSettings = {
    name: string;
    business_hours_start: string;
    business_hours_end: string;
    minutes_range_start: number;
    minutes_range_end: number;
    delay_same_state: number;
    delay_same_county: number;
    delay_same_investor: number;
    send_next_lead_at: string;
    states_on_hold: string[];
};