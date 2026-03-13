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
    blocked_affiliate_ids: string[]; // Array of affiliate IDs to block
    states_on_hold: string[]; // Array of state codes this buyer won't accept
    delay_same_county: number; // Hours to wait before sending another lead from same county
    delay_same_state: number; // Hours to wait before sending another lead from same state
    enforce_county_cooldown: boolean; // Toggle for county cooldown enforcement
    enforce_state_cooldown: boolean; // Toggle for state cooldown enforcement
    payload_format: 'default' | 'northstar';
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
    blocked_affiliate_ids?: string[]; // Array of affiliate IDs to block
    states_on_hold?: string[]; // Array of state codes to block
    delay_same_county?: number;
    delay_same_state?: number;
    enforce_county_cooldown?: boolean;
    enforce_state_cooldown?: boolean;
    payload_format?: 'default' | 'northstar';
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
    next_send_at?: string; // ISO datetime string for next scheduled send
    auth_header_name?: string;
    auth_header_prefix?: string | null;
    auth_token?: string | null; // Plain text token (will be encrypted by backend)
    blocked_affiliate_ids?: string[]; // Array of affiliate IDs to block
    states_on_hold?: string[]; // Array of state codes to block
    delay_same_county?: number;
    delay_same_state?: number;
    enforce_county_cooldown?: boolean;
    enforce_state_cooldown?: boolean;
    payload_format?: 'default' | 'northstar';
};
