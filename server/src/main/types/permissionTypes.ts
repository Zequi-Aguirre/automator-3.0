export enum LeadPermission {
    READ = 'leads.read',
    VERIFY = 'leads.verify',
    QUEUE = 'leads.queue',
    IMPORT = 'leads.import',
    EXPORT = 'leads.export',
    SEND = 'leads.send',
    TRASH = 'leads.trash',
    EDIT = 'leads.edit',
    UNTRASH = 'leads.untrash',
    // TICKET-065: Call tracking permissions
    CALL_REQUEST = 'leads.call_request',
    CALL_EXECUTE = 'leads.call_execute',
    // TICKET-105: Per-tab visibility permissions
    VIEW_NEW = 'leads.view_new',
    VIEW_VERIFIED = 'leads.view_verified',
    VIEW_NEEDS_REVIEW = 'leads.view_needs_review',
    VIEW_NEEDS_CALL = 'leads.view_needs_call',
    VIEW_SENT = 'leads.view_sent',
    VIEW_SOLD = 'leads.view_sold',
    VIEW_TRASH = 'leads.view_trash',
}

export enum WorkerSettingsPermission {
    TOGGLE = 'worker.toggle',
    MANAGE = 'settings.manage',
}

export enum SourcePermission {
    MANAGE = 'sources.manage',
}

export enum BuyerPermission {
    MANAGE = 'buyers.manage',
    HOLD = 'buyers.hold',
}

export enum ManagerPermission {
    MANAGE = 'managers.manage',
}

export enum CountyPermission {
    MANAGE = 'counties.manage',
}

export enum LogPermission {
    VIEW = 'logs.view',
}

export enum UserPermission {
    MANAGE = 'users.manage',
    APPROVE = 'users.approve',
}

export enum ActivityPermission {
    VIEW = 'activity.view',
}

export enum TrashReasonPermission {
    MANAGE = 'trash_reasons.manage',
}

export enum CallRequestReasonPermission {
    MANAGE = 'call_request_reasons.manage',
}

export enum CallOutcomePermission {
    MANAGE = 'call_outcomes.manage',
}

export enum DisputePermission {
    CREATE = 'disputes.create',
}

// TICKET-130: Zoe AI permissions (superadmin only)
export enum ZoePermission {
    MANAGE_KEYS = 'zoe.manage_keys',
    MANAGE_CONFIG = 'zoe.manage_config',
}

// TICKET-137: Reconciliation importer
export enum ReconciliationPermission {
    VIEW = 'reconciliation.view',
    MANAGE = 'reconciliation.manage',
}

// TICKET-140: Platform connections (encrypted external DB credentials for platformSync)
export enum PlatformConnectionPermission {
    MANAGE = 'platform_connections.manage',
}

// TICKET-143: Facebook Lead Ads integration
export enum FacebookPermission {
    VIEW = 'facebook.view',
    SYNC = 'facebook.sync',
}

// TICKET-152: Lead Custom Fields
export enum LeadCustomFieldPermission {
    MANAGE = 'lead_custom_fields.manage',
}

export type Permission =
    | LeadPermission
    | WorkerSettingsPermission
    | SourcePermission
    | BuyerPermission
    | ManagerPermission
    | CountyPermission
    | LogPermission
    | UserPermission
    | ActivityPermission
    | TrashReasonPermission
    | CallRequestReasonPermission
    | CallOutcomePermission
    | DisputePermission
    | ZoePermission
    | ReconciliationPermission
    | PlatformConnectionPermission
    | FacebookPermission
    | LeadCustomFieldPermission;

export type UserRole = 'user' | 'admin' | 'superadmin' | 'worker';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    // System service account — no UI permissions; exists only for activity attribution
    worker: [],
    user: [
        LeadPermission.READ,
        LeadPermission.VERIFY,
        LeadPermission.QUEUE,
        LeadPermission.EDIT,
        LeadPermission.CALL_REQUEST,
        LeadPermission.CALL_EXECUTE,
        LeadPermission.VIEW_NEW,
        LeadPermission.VIEW_VERIFIED,
        LeadPermission.VIEW_NEEDS_REVIEW,
        LeadPermission.VIEW_NEEDS_CALL,
        ActivityPermission.VIEW,
        DisputePermission.CREATE,
    ],
    admin: [
        LeadCustomFieldPermission.MANAGE,
        LeadPermission.READ,
        LeadPermission.VERIFY,
        LeadPermission.QUEUE,
        LeadPermission.IMPORT,
        LeadPermission.EXPORT,
        LeadPermission.SEND,
        LeadPermission.TRASH,
        LeadPermission.EDIT,
        LeadPermission.UNTRASH,
        LeadPermission.CALL_REQUEST,
        LeadPermission.CALL_EXECUTE,
        LeadPermission.VIEW_NEW,
        LeadPermission.VIEW_VERIFIED,
        LeadPermission.VIEW_NEEDS_REVIEW,
        LeadPermission.VIEW_NEEDS_CALL,
        LeadPermission.VIEW_SENT,
        LeadPermission.VIEW_SOLD,
        LeadPermission.VIEW_TRASH,
        SourcePermission.MANAGE,
        ManagerPermission.MANAGE,
        CountyPermission.MANAGE,
        LogPermission.VIEW,
        ActivityPermission.VIEW,
        TrashReasonPermission.MANAGE,
        CallRequestReasonPermission.MANAGE,
        CallOutcomePermission.MANAGE,
        DisputePermission.CREATE,
        BuyerPermission.HOLD,
    ],
    superadmin: [
        LeadCustomFieldPermission.MANAGE,
        ZoePermission.MANAGE_KEYS,
        ZoePermission.MANAGE_CONFIG,
        ReconciliationPermission.VIEW,
        ReconciliationPermission.MANAGE,
        PlatformConnectionPermission.MANAGE,
        FacebookPermission.VIEW,
        FacebookPermission.SYNC,
        LeadPermission.READ,
        LeadPermission.VERIFY,
        LeadPermission.QUEUE,
        LeadPermission.IMPORT,
        LeadPermission.EXPORT,
        LeadPermission.SEND,
        LeadPermission.TRASH,
        LeadPermission.EDIT,
        LeadPermission.UNTRASH,
        LeadPermission.CALL_REQUEST,
        LeadPermission.CALL_EXECUTE,
        LeadPermission.VIEW_NEW,
        LeadPermission.VIEW_VERIFIED,
        LeadPermission.VIEW_NEEDS_REVIEW,
        LeadPermission.VIEW_NEEDS_CALL,
        LeadPermission.VIEW_SENT,
        LeadPermission.VIEW_SOLD,
        LeadPermission.VIEW_TRASH,
        SourcePermission.MANAGE,
        ManagerPermission.MANAGE,
        BuyerPermission.MANAGE,
        BuyerPermission.HOLD,
        CountyPermission.MANAGE,
        LogPermission.VIEW,
        WorkerSettingsPermission.TOGGLE,
        WorkerSettingsPermission.MANAGE,
        UserPermission.MANAGE,
        UserPermission.APPROVE,
        ActivityPermission.VIEW,
        TrashReasonPermission.MANAGE,
        CallRequestReasonPermission.MANAGE,
        CallOutcomePermission.MANAGE,
        DisputePermission.CREATE,
    ],
};
