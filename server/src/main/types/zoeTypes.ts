// TICKET-127, TICKET-128, TICKET-130, TICKET-131 — Zoe AI types

export type ZoeStatus = 'completed' | 'needs_clarification' | 'failed';

export interface ZoeResponse {
    request_id: string;
    status: ZoeStatus;
    user_question: string;
    summary: string | null;
    table: Record<string, unknown>[] | null;
    sql_executed: string | null;
    row_count: number | null;
    caveats: string[];
    clarification_question: string | null;
    generated_at: string;
}

export interface ZoeApiKey {
    id: string;
    name: string;
    active: boolean;
    last_used_at: string | null;
    created: string;
    revoked_at: string | null;
    created_by_name: string | null;
}

export interface ZoeApiKeyCreateResult {
    id: string;
    name: string;
    plaintext_key: string; // shown once only
    created: string;
}

export interface ZoeConfig {
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
    updated_by_name: string | null;
}

export interface ZoeConfigUpdateDTO {
    value: string;
}

export interface ZoeAskDTO {
    question: string;
    conversation_id?: string;
}
