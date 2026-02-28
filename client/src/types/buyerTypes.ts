export type Buyer = {
    id: string;
    name: string;
    webhook_url: string;
    dispatch_mode: 'manual' | 'worker' | 'both';
    priority: number;
    auto_send: boolean;
    allow_resell: boolean;
    requires_validation: boolean;
    min_minutes_between_sends: number;
    max_minutes_between_sends: number;
    next_send_at: string | null;
    last_send_at: string | null;
    total_sends: number;
    auth_header_name: string;
    auth_header_prefix: string | null;
    auth_token_encrypted: string | null; // Will be masked (***MASKED***)
    created: string;
    modified: string;
    deleted: string | null;
};

export type BuyerCreateDTO = {
    name: string;
    webhook_url: string;
    dispatch_mode?: 'manual' | 'worker' | 'both';
    priority: number;
    auto_send?: boolean;
    allow_resell?: boolean;
    requires_validation?: boolean;
    min_minutes_between_sends?: number;
    max_minutes_between_sends?: number;
    auth_header_name?: string;
    auth_header_prefix?: string | null;
    auth_token?: string | null; // Plain text token (will be encrypted by backend)
};

export type BuyerUpdateDTO = {
    name?: string;
    webhook_url?: string;
    dispatch_mode?: 'manual' | 'worker' | 'both';
    priority?: number;
    auto_send?: boolean;
    allow_resell?: boolean;
    requires_validation?: boolean;
    min_minutes_between_sends?: number;
    max_minutes_between_sends?: number;
    auth_header_name?: string;
    auth_header_prefix?: string | null;
    auth_token?: string | null; // Plain text token (will be encrypted by backend)
};
