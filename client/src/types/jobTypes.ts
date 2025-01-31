export type Job = {
    id: string;
    name: string;
    description: string | null;
    interval_minutes: number;
    last_run: Date | null;
    is_paused: boolean;
    created: Date;
    updated: Date;
    deleted: Date | null;
}