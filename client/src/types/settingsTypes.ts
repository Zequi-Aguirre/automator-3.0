export type WorkerSettings = {
    id: string;
    name: string;
    business_hours_start: number;
    business_hours_end: number;
    min_delay: number;
    max_delay: number;
    expire_after_hours: number;
    enforce_expiration: boolean;
    auto_queue_on_verify: boolean;
    last_worker_run: string;
    worker_enabled: boolean;
    cron_schedule: string;
    created: Date;
    modified: Date;
    deleted: Date | null;
};

// Subset of settings that can be edited from the UI
export type EditableWorkerSettings = {
    name: string;
    business_hours_start: string;
    business_hours_end: string;
    expire_after_hours: number;
    enforce_expiration: boolean;
    auto_queue_on_verify: boolean;
};