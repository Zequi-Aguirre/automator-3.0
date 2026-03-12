export enum EntityType {
    LEAD = 'lead',
    BUYER = 'buyer',
    SOURCE = 'source',
    CAMPAIGN = 'campaign',
    COUNTY = 'county',
    LEAD_MANAGER = 'lead_manager',
}

export enum ActivityAction {
    // Lead
    LEAD_IMPORTED = 'lead_imported',
    LEAD_VERIFIED = 'lead_verified',
    LEAD_UNVERIFIED = 'lead_unverified',
    LEAD_UPDATED = 'lead_updated',
    LEAD_TRASHED = 'lead_trashed',
    LEAD_DOWNLOADED = 'lead_downloaded',
    LEAD_SENT = 'lead_sent',
    LEAD_QUEUED = 'lead_queued',
    LEAD_UNQUEUED = 'lead_unqueued',

    // Verification
    VERIFICATION_STARTED = 'verification_started',
    VERIFICATION_SAVED = 'verification_saved',

    // Worker
    WORKER_STARTED = 'worker_started',
    WORKER_STOPPED = 'worker_stopped',
    WORKER_SETTINGS_UPDATED = 'worker_settings_updated',

    // Source
    SOURCE_CREATED = 'source_created',
    SOURCE_UPDATED = 'source_updated',
    SOURCE_TOKEN_REFRESHED = 'source_token_refreshed',

    // Buyer
    BUYER_CREATED = 'buyer_created',
    BUYER_UPDATED = 'buyer_updated',

    // Campaign
    CAMPAIGN_MANAGER_ASSIGNED = 'campaign_manager_assigned',

    // Lead Manager
    LEAD_MANAGER_CREATED = 'lead_manager_created',
    LEAD_MANAGER_UPDATED = 'lead_manager_updated',

    // County
    COUNTY_UPDATED = 'county_updated',

    // User / Auth
    USER_LOGIN = 'user_login',
    USER_LOGIN_FAILED = 'user_login_failed',
}

export type ActivityLog = {
    id: string;
    user_id: string | null;
    lead_id: string | null;
    entity_type: EntityType | null;
    entity_id: string | null;
    action: ActivityAction;
    action_details: Record<string, any> | null;
    created: string;
    user_name?: string | null;
};

export type ActivityCreateDTO = {
    user_id?: string | null;
    lead_id?: string | null;
    entity_type?: EntityType | null;
    entity_id?: string | null;
    action: ActivityAction;
    action_details?: Record<string, any> | null;
};

export type UserActivityStats = {
    user_id: string;
    user_name: string;
    verified: number;
    sent: number;
    deleted: number;
};
