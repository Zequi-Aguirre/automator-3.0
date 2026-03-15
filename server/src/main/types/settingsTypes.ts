export type WorkerSettings = {
    id: string;
    name: string;
    business_hours_start: number;
    business_hours_end: number;
    min_delay: number;
    max_delay: number;
    last_worker_run: string;
    worker_enabled: boolean;
    cron_schedule: string;
    expire_after_hours: number;
    enforce_expiration: boolean;
    auto_queue_on_verify: boolean;
    created: Date;
    modified: Date;
    deleted: Date | null;
};

export type WorkerSettingsUpdateAllowedFieldsType = {
    name: string;
    business_hours_start: number | null;
    business_hours_end: number | null;
    worker_enabled: boolean | null;
    cron_schedule: string | null;
    expire_after_hours: number | null;
    enforce_expiration: boolean | null;
    auto_queue_on_verify: boolean | null;
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
