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
    today: number;
    week: number;
    month: number;
};
