export enum ActivityAction {
    LEAD_IMPORTED = 'lead_imported',
    LEAD_VERIFIED = 'lead_verified',
    LEAD_UNVERIFIED = 'lead_unverified',
    LEAD_UPDATED = 'lead_updated',
    VERIFICATION_STARTED = 'verification_started',
    VERIFICATION_SAVED = 'verification_saved',
    LEAD_TRASHED = 'lead_trashed',
    LEAD_DOWNLOADED = 'lead_downloaded',
    LEAD_SENT = 'lead_sent',
    WORKER_STARTED = 'worker_started',
    WORKER_STOPPED = 'worker_stopped',
    WORKER_SETTINGS_UPDATED = 'worker_settings_updated',
    LEAD_QUEUED = 'lead_queued',
    LEAD_UNQUEUED = 'lead_unqueued',
    SOURCE_CREATED = 'source_created',
    SOURCE_UPDATED = 'source_updated',
    SOURCE_TOKEN_REFRESHED = 'source_token_refreshed',
    CAMPAIGN_MANAGER_ASSIGNED = 'campaign_manager_assigned',
    BUYER_CREATED = 'buyer_created',
    BUYER_UPDATED = 'buyer_updated',
    LEAD_MANAGER_CREATED = 'lead_manager_created',
    LEAD_MANAGER_UPDATED = 'lead_manager_updated',
    COUNTY_UPDATED = 'county_updated',
    USER_LOGIN = 'user_login',
    USER_LOGIN_FAILED = 'user_login_failed',
}

export type ActivityLog = {
    id: string;
    user_id: string | null;
    lead_id: string | null;
    entity_type: string | null;
    entity_id: string | null;
    action: ActivityAction;
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
    [ActivityAction.LEAD_IMPORTED]: 'Lead Imported',
    [ActivityAction.LEAD_VERIFIED]: 'Lead Verified',
    [ActivityAction.LEAD_UNVERIFIED]: 'Lead Unverified',
    [ActivityAction.LEAD_UPDATED]: 'Lead Updated',
    [ActivityAction.VERIFICATION_STARTED]: 'Verification Started',
    [ActivityAction.VERIFICATION_SAVED]: 'Verification Saved',
    [ActivityAction.LEAD_TRASHED]: 'Lead Trashed',
    [ActivityAction.LEAD_DOWNLOADED]: 'Lead Downloaded',
    [ActivityAction.LEAD_SENT]: 'Lead Sent',
    [ActivityAction.WORKER_STARTED]: 'Worker Started',
    [ActivityAction.WORKER_STOPPED]: 'Worker Stopped',
    [ActivityAction.WORKER_SETTINGS_UPDATED]: 'Settings Updated',
    [ActivityAction.LEAD_QUEUED]: 'Lead Queued',
    [ActivityAction.LEAD_UNQUEUED]: 'Lead Unqueued',
    [ActivityAction.SOURCE_CREATED]: 'Source Created',
    [ActivityAction.SOURCE_UPDATED]: 'Source Updated',
    [ActivityAction.SOURCE_TOKEN_REFRESHED]: 'Token Refreshed',
    [ActivityAction.CAMPAIGN_MANAGER_ASSIGNED]: 'Manager Assigned',
    [ActivityAction.BUYER_CREATED]: 'Buyer Created',
    [ActivityAction.BUYER_UPDATED]: 'Buyer Updated',
    [ActivityAction.LEAD_MANAGER_CREATED]: 'Manager Created',
    [ActivityAction.LEAD_MANAGER_UPDATED]: 'Manager Updated',
    [ActivityAction.COUNTY_UPDATED]: 'County Updated',
    [ActivityAction.USER_LOGIN]: 'User Login',
    [ActivityAction.USER_LOGIN_FAILED]: 'Login Failed',
};
