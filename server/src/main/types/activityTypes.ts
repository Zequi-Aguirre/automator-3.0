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
    | 'worker_settings_updated'
    | 'source_created'
    | 'source_updated'
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

export type ActivityCreateDTO = {
    user_id?: string | null;
    lead_id?: string | null;
    entity_type?: string | null;
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
