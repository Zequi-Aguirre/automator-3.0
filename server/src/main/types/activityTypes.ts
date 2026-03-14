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

export enum TrashReasonAction {
    CREATED = 'trash_reason_created',
    ACTIVATED = 'trash_reason_activated',
    DEACTIVATED = 'trash_reason_deactivated',
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
    | DisputeAction
    | RoleAction;

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
