// TICKET-140: Platform connection types (client-side — no encrypted_password)
// A connection is to an external DATABASE, not to a specific buyer.

export type PlatformConnection = {
    id: string;
    label: string | null;
    host: string;
    port: number;
    dbname: string;
    db_username: string;
    lookback_days: number;
    is_active: boolean;
    last_synced_at: string | null;
    created: string;
    modified: string;
};

export type PlatformConnectionCreateDTO = {
    label?: string;
    host: string;
    port?: number;
    dbname: string;
    db_username: string;
    password: string;
    lookback_days?: number;
};

export type PlatformConnectionUpdateDTO = {
    label?: string | null;
    host?: string;
    port?: number;
    dbname?: string;
    db_username?: string;
    password?: string;
    lookback_days?: number;
    is_active?: boolean;
};
