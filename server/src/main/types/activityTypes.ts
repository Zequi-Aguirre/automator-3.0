export enum EntityType {
    LEAD = 'lead',
    BUYER = 'buyer',
    SOURCE = 'source',
    CAMPAIGN = 'campaign',
    COUNTY = 'county',
    LEAD_MANAGER = 'lead_manager',
    USER = 'user',
}

export enum LeadAction {
    IMPORTED = 'lead_imported',
    VERIFIED = 'lead_verified',
    UNVERIFIED = 'lead_unverified',
    UPDATED = 'lead_updated',
    TRASHED = 'lead_trashed',
    UNTRASHED = 'lead_untrashed',
    DOWNLOADED = 'lead_downloaded',
    SENT = 'lead_sent',
    QUEUED = 'lead_queued',
    AUTO_QUEUED = 'lead_auto_queued',
    UNQUEUED = 'lead_unqueued',
    NEEDS_REVIEW_RESOLVED = 'lead_needs_review_resolved',
    // TICKET-065: Call tracking
    CALL_REQUESTED = 'lead_call_requested',
    CALL_REQUEST_CANCELLED = 'lead_call_request_cancelled',
    CALL_EXECUTED = 'lead_call_executed',
    CALL_RESOLVED = 'lead_call_resolved',
}

export enum VerificationAction {
    STARTED = 'verification_started',
    SAVED = 'verification_saved',
}

export enum WorkerAction {
    STARTED = 'worker_started',
    STOPPED = 'worker_stopped',
    SETTINGS_UPDATED = 'worker_settings_updated',
    LEADS_EXPIRED = 'worker_leads_expired',
}

export enum SourceAction {
    CREATED = 'source_created',
    UPDATED = 'source_updated',
    TOKEN_REFRESHED = 'source_token_refreshed',
    LEAD_MANAGER_ASSIGNED = 'source_lead_manager_assigned',
    BUYER_FILTER_UPDATED = 'source_buyer_filter_updated',
}

export enum BuyerAction {
    CREATED = 'buyer_created',
    UPDATED = 'buyer_updated',
    PUT_ON_HOLD = 'buyer_put_on_hold',
    REMOVED_FROM_HOLD = 'buyer_removed_from_hold',
}

export enum CampaignAction {
    MANAGER_ASSIGNED = 'campaign_manager_assigned',
}

export enum LeadManagerAction {
    CREATED = 'lead_manager_created',
    UPDATED = 'lead_manager_updated',
}

export enum CountyAction {
    UPDATED = 'county_updated',
    BUYER_FILTER_UPDATED = 'county_buyer_filter_updated',
}

export enum AuthAction {
    LOGIN = 'user_login',
    LOGIN_FAILED = 'user_login_failed',
}

export enum UserAction {
    ROLE_CHANGED = 'user_role_changed',
    PERMISSIONS_CHANGED = 'user_permissions_changed',
    USER_CREATED = 'user_created',
    USER_ACCOUNT_REQUESTED = 'user_account_requested',
    USER_ACCOUNT_APPROVED = 'user_account_approved',
    USER_ACCOUNT_DENIED = 'user_account_denied',
    PASSWORD_RESET = 'user_password_reset',
    PASSWORD_CHANGED = 'user_password_changed',
    // TICKET-151
    PASSWORD_RESET_REQUESTED = 'user_password_reset_requested',
    PASSWORD_SET_BY_TOKEN = 'user_password_set_by_token',
    PASSWORD_SET_BY_ADMIN = 'user_password_set_by_admin',
}

export enum TrashReasonAction {
    CREATED = 'trash_reason_created',
    ACTIVATED = 'trash_reason_activated',
    DEACTIVATED = 'trash_reason_deactivated',
    COMMENT_REQUIRED_ON = 'trash_reason_comment_required_on',
    COMMENT_REQUIRED_OFF = 'trash_reason_comment_required_off',
    DELETED = 'trash_reason_deleted',
}

export enum CallOutcomeAction {
    CREATED = 'call_outcome_created',
    ACTIVATED = 'call_outcome_activated',
    DEACTIVATED = 'call_outcome_deactivated',
    COMMENT_REQUIRED_ON = 'call_outcome_comment_required_on',
    COMMENT_REQUIRED_OFF = 'call_outcome_comment_required_off',
    RESOLVES_CALL_ON = 'call_outcome_resolves_call_on',
    RESOLVES_CALL_OFF = 'call_outcome_resolves_call_off',
    DELETED = 'call_outcome_deleted',
}

export enum CallRequestReasonAction {
    CREATED = 'call_request_reason_created',
    ACTIVATED = 'call_request_reason_activated',
    DEACTIVATED = 'call_request_reason_deactivated',
    COMMENT_REQUIRED_ON = 'call_request_reason_comment_required_on',
    COMMENT_REQUIRED_OFF = 'call_request_reason_comment_required_off',
    DELETED = 'call_request_reason_deleted',
}

export enum DisputeAction {
    CREATED = 'dispute_created',
    REMOVED = 'dispute_removed',
}

export enum RoleAction {
    CREATED = 'role_created',
    UPDATED = 'role_updated',
    DELETED = 'role_deleted',
}

// TICKET-128, TICKET-130: Zoe AI actions
export enum ZoeAction {
    ASKED = 'zoe_asked',
    KEY_CREATED = 'zoe_key_created',
    KEY_REVOKED = 'zoe_key_revoked',
    CONFIG_UPDATED = 'zoe_config_updated',
}

// TICKET-137: Reconciliation importer
// TICKET-138: Reconciliation matching engine
export enum ReconciliationAction {
    IMPORTED = 'reconciliation_imported',
    MATCHED  = 'reconciliation_matched',
}

// TICKET-140: Platform connections
export enum PlatformConnectionAction {
    CREATED = 'platform_connection_created',
    UPDATED = 'platform_connection_updated',
    DELETED = 'platform_connection_deleted',
}

export type ActivityAction =
    | LeadAction
    | VerificationAction
    | WorkerAction
    | SourceAction
    | BuyerAction
    | CampaignAction
    | LeadManagerAction
    | CountyAction
    | AuthAction
    | UserAction
    | TrashReasonAction
    | CallOutcomeAction
    | CallRequestReasonAction
    | DisputeAction
    | RoleAction
    | ZoeAction
    | ReconciliationAction
    | PlatformConnectionAction;

export type ActivityLog = {
    id: string;
    user_id: string | null;
    lead_id: string | null;
    entity_type: EntityType | null;
    entity_id: string | null;
    action: ActivityAction;
    action_details: Record<string, unknown> | null;
    created: string;
    user_name?: string | null;
};

export type ActivityCreateDTO = {
    user_id?: string | null;
    lead_id?: string | null;
    entity_type?: EntityType | null;
    entity_id?: string | null;
    action: ActivityAction;
    action_details?: Record<string, unknown> | null;
};

export type UserActivityStats = {
    user_id: string;
    user_name: string;
    verified: number;
    sent: number;
    deleted: number;
};
