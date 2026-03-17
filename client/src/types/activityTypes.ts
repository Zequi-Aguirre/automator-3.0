export enum LeadAction {
    IMPORTED = 'lead_imported',
    VERIFIED = 'lead_verified',
    UNVERIFIED = 'lead_unverified',
    UPDATED = 'lead_updated',
    TRASHED = 'lead_trashed',
    DOWNLOADED = 'lead_downloaded',
    SENT = 'lead_sent',
    QUEUED = 'lead_queued',
    AUTO_QUEUED = 'lead_auto_queued',
    UNQUEUED = 'lead_unqueued',
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
}

export enum AuthAction {
    LOGIN = 'user_login',
    LOGIN_FAILED = 'user_login_failed',
}

export enum UserAction {
    ROLE_CHANGED = 'user_role_changed',
    PERMISSIONS_CHANGED = 'user_permissions_changed',
}

export enum TrashReasonAction {
    CREATED = 'trash_reason_created',
    ACTIVATED = 'trash_reason_activated',
    DEACTIVATED = 'trash_reason_deactivated',
    COMMENT_REQUIRED_ON = 'trash_reason_comment_required_on',
    COMMENT_REQUIRED_OFF = 'trash_reason_comment_required_off',
    DELETED = 'trash_reason_deleted',
}

export enum CallRequestReasonAction {
    CREATED = 'call_request_reason_created',
    ACTIVATED = 'call_request_reason_activated',
    DEACTIVATED = 'call_request_reason_deactivated',
    COMMENT_REQUIRED_ON = 'call_request_reason_comment_required_on',
    COMMENT_REQUIRED_OFF = 'call_request_reason_comment_required_off',
    DELETED = 'call_request_reason_deleted',
}

export enum CallOutcomeAction {
    CREATED = 'call_outcome_created',
    ACTIVATED = 'call_outcome_activated',
    DEACTIVATED = 'call_outcome_deactivated',
    DELETED = 'call_outcome_deleted',
}

export enum RoleAction {
    CREATED = 'role_created',
    UPDATED = 'role_updated',
    DELETED = 'role_deleted',
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
    | CallRequestReasonAction
    | CallOutcomeAction
    | RoleAction;

export type ActivityLog = {
    id: string;
    user_id: string | null;
    lead_id: string | null;
    entity_type: string | null;
    entity_id: string | null;
    action: ActivityAction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    action_details: Record<string, any> | null;
    created: string;
    user_name?: string | null;
};

export type UserActivityStats = {
    user_id: string;
    user_name: string;
    verified: number;
    sent: number;
    deleted: number;
};

export const ACTION_LABELS: Record<ActivityAction, string> = {
    // Lead
    [LeadAction.IMPORTED]: 'Lead Imported',
    [LeadAction.VERIFIED]: 'Lead Verified',
    [LeadAction.UNVERIFIED]: 'Lead Unverified',
    [LeadAction.UPDATED]: 'Lead Updated',
    [LeadAction.TRASHED]: 'Lead Trashed',
    [LeadAction.DOWNLOADED]: 'Lead Downloaded',
    [LeadAction.SENT]: 'Lead Sent',
    [LeadAction.QUEUED]: 'Lead Sent to Worker',
    [LeadAction.AUTO_QUEUED]: 'Lead Auto-Sent to Worker on Verify',
    [LeadAction.UNQUEUED]: 'Lead Removed from Worker',
    [LeadAction.CALL_REQUESTED]: 'Call Requested',
    [LeadAction.CALL_REQUEST_CANCELLED]: 'Call Request Cancelled',
    [LeadAction.CALL_EXECUTED]: 'Call Logged',
    [LeadAction.CALL_RESOLVED]: 'Call Resolved',

    // Verification
    [VerificationAction.STARTED]: 'Verification Started',
    [VerificationAction.SAVED]: 'Verification Saved',

    // Worker
    [WorkerAction.STARTED]: 'Worker Started',
    [WorkerAction.STOPPED]: 'Worker Stopped',
    [WorkerAction.SETTINGS_UPDATED]: 'Settings Updated',
    [WorkerAction.LEADS_EXPIRED]: 'Leads Expired',

    // Source
    [SourceAction.CREATED]: 'Source Created',
    [SourceAction.UPDATED]: 'Source Updated',
    [SourceAction.TOKEN_REFRESHED]: 'Token Refreshed',
    [SourceAction.LEAD_MANAGER_ASSIGNED]: 'Lead Manager Assigned',

    // Buyer
    [BuyerAction.CREATED]: 'Buyer Created',
    [BuyerAction.UPDATED]: 'Buyer Updated',
    [BuyerAction.PUT_ON_HOLD]: 'Buyer Put on Hold',
    [BuyerAction.REMOVED_FROM_HOLD]: 'Buyer Removed from Hold',

    // Campaign
    [CampaignAction.MANAGER_ASSIGNED]: 'Manager Assigned',

    // Lead Manager
    [LeadManagerAction.CREATED]: 'Manager Created',
    [LeadManagerAction.UPDATED]: 'Manager Updated',

    // County
    [CountyAction.UPDATED]: 'County Updated',

    // Auth
    [AuthAction.LOGIN]: 'User Login',
    [AuthAction.LOGIN_FAILED]: 'Login Failed',

    // User management
    [UserAction.ROLE_CHANGED]: 'Role Changed',
    [UserAction.PERMISSIONS_CHANGED]: 'Permissions Changed',

    // Trash reasons
    [TrashReasonAction.CREATED]: 'Trash Reason Created',
    [TrashReasonAction.ACTIVATED]: 'Trash Reason Activated',
    [TrashReasonAction.DEACTIVATED]: 'Trash Reason Deactivated',
    [TrashReasonAction.COMMENT_REQUIRED_ON]: 'Trash Reason — Comment Made Mandatory',
    [TrashReasonAction.COMMENT_REQUIRED_OFF]: 'Trash Reason — Comment Made Optional',
    [TrashReasonAction.DELETED]: 'Trash Reason Deleted',

    // Call request reasons
    [CallRequestReasonAction.CREATED]: 'Call Request Reason Created',
    [CallRequestReasonAction.ACTIVATED]: 'Call Request Reason Activated',
    [CallRequestReasonAction.DEACTIVATED]: 'Call Request Reason Deactivated',
    [CallRequestReasonAction.COMMENT_REQUIRED_ON]: 'Call Request Reason — Comment Made Mandatory',
    [CallRequestReasonAction.COMMENT_REQUIRED_OFF]: 'Call Request Reason — Comment Made Optional',
    [CallRequestReasonAction.DELETED]: 'Call Request Reason Deleted',

    // Call outcomes
    [CallOutcomeAction.CREATED]: 'Call Outcome Created',
    [CallOutcomeAction.ACTIVATED]: 'Call Outcome Activated',
    [CallOutcomeAction.DEACTIVATED]: 'Call Outcome Deactivated',
    [CallOutcomeAction.DELETED]: 'Call Outcome Deleted',

    // Permission roles
    [RoleAction.CREATED]: 'Role Created',
    [RoleAction.UPDATED]: 'Role Updated',
    [RoleAction.DELETED]: 'Role Deleted',
};
