export type ActivityAction =
    | 'lead_imported'
    | 'lead_verified'
    | 'lead_unverified'
    | 'lead_updated'
    | 'lead_trashed'
    | 'lead_downloaded'
    | 'lead_sent'
    | 'worker_enabled'
    | 'worker_disabled'
    | 'source_created'
    | 'campaign_manager_assigned'
    | 'buyer_created'
    | 'buyer_updated';

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
    today: number;
    week: number;
    month: number;
};

export const ACTION_LABELS: Record<ActivityAction, string> = {
    lead_imported: 'Lead Imported',
    lead_verified: 'Lead Verified',
    lead_unverified: 'Lead Unverified',
    lead_updated: 'Lead Updated',
    lead_trashed: 'Lead Trashed',
    lead_downloaded: 'Lead Downloaded',
    lead_sent: 'Lead Sent',
    worker_enabled: 'Worker Enabled',
    worker_disabled: 'Worker Disabled',
    source_created: 'Source Created',
    campaign_manager_assigned: 'Manager Assigned',
    buyer_created: 'Buyer Created',
    buyer_updated: 'Buyer Updated',
};
