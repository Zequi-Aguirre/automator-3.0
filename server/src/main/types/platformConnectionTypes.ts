// TICKET-140: Platform connection types
// A connection is to an external DATABASE (e.g. Northstar prod) scoped to one automator buyer.

export type PlatformConnection = {
    id: string;
    label: string | null;
    host: string;
    port: number;
    dbname: string;
    db_username: string;
    // encrypted_password is never returned to the client
    lookback_days: number;
    is_active: boolean;
    automator_buyer_id: string | null;
    last_synced_at: Date | null;
    created: Date;
    modified: Date;
    deleted: Date | null;
};

export type PlatformConnectionCreateDTO = {
    label?: string | null;
    host: string;
    port?: number;
    dbname: string;
    db_username: string;
    password: string;
    lookback_days?: number;
    automator_buyer_id?: string | null;
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
    automator_buyer_id?: string | null;
};
