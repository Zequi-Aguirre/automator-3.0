export type ActivityAction =
    | 'lead_imported'
    | 'lead_verified'
    | 'lead_unverified'
    | 'lead_updated'
    | 'lead_trashed'
    | 'lead_downloaded'
    | 'lead_sent'
    | 'worker_started'
    | 'worker_stopped'
    | 'worker_settings_updated'
    | 'lead_queued'
    | 'lead_unqueued'
    | 'source_created'
    | 'source_updated'
    | 'source_token_refreshed'
    | 'campaign_manager_assigned'
    | 'buyer_created'
    | 'buyer_updated'
    | 'lead_manager_created'
    | 'lead_manager_updated'
    | 'county_updated';

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
    lead_imported: 'Lead Imported',
    lead_verified: 'Lead Verified',
    lead_unverified: 'Lead Unverified',
    lead_updated: 'Lead Updated',
    lead_trashed: 'Lead Trashed',
    lead_downloaded: 'Lead Downloaded',
    lead_sent: 'Lead Sent',
    worker_started: 'Worker Started',
    worker_stopped: 'Worker Stopped',
    worker_settings_updated: 'Settings Updated',
    lead_queued: 'Lead Queued',
    lead_unqueued: 'Lead Unqueued',
    source_created: 'Source Created',
    source_updated: 'Source Updated',
    source_token_refreshed: 'Token Refreshed',
    campaign_manager_assigned: 'Manager Assigned',
    buyer_created: 'Buyer Created',
    buyer_updated: 'Buyer Updated',
    lead_manager_created: 'Manager Created',
    lead_manager_updated: 'Manager Updated',
    county_updated: 'County Updated',
};
