// TICKET-140: Platform connection types (client-side — no encrypted_password)

export type PlatformConnection = {
    id: string;
    automator_buyer_id: string;
    buyer_name: string;
    northstar_buyer_id: string;
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
    automator_buyer_id: string;
    northstar_buyer_id: string;
    label?: string;
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
    password?: string;
    lookback_days?: number;
    is_active?: boolean;
};
