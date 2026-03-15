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
    [LeadAction.QUEUED]: 'Lead Queued',
    [LeadAction.AUTO_QUEUED]: 'Lead Auto-Queued on Verify',
    [LeadAction.UNQUEUED]: 'Lead Unqueued',

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

    // Permission roles
    [RoleAction.CREATED]: 'Role Created',
    [RoleAction.UPDATED]: 'Role Updated',
    [RoleAction.DELETED]: 'Role Deleted',
};
