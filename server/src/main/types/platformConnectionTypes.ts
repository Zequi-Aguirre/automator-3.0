// TICKET-140: Platform connection types

export type PlatformConnection = {
    id: string;
    automator_buyer_id: string;
    northstar_buyer_id: string;
    label: string | null;
    host: string;
    port: number;
    dbname: string;
    db_username: string;
    // encrypted_password is never returned to the client
    lookback_days: number;
    is_active: boolean;
    last_synced_at: Date | null;
    created: Date;
    modified: Date;
    deleted: Date | null;
    // joined from buyers
    buyer_name?: string;
};

export type PlatformConnectionCreateDTO = {
    automator_buyer_id: string;
    northstar_buyer_id: string;
    label?: string | null;
    host: string;
    port?: number;
    dbname: string;
    db_username: string;
    password: string;
    lookback_days?: number;
};

export type PlatformConnectionUpdateDTO = {
    northstar_buyer_id?: string;
    label?: string | null;
    host?: string;
    port?: number;
    dbname?: string;
    db_username?: string;
    password?: string;   // only provided if changing the password
    lookback_days?: number;
    is_active?: boolean;
};
