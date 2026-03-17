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

export enum DisputePermission {
    CREATE = 'disputes.create',
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
    | DisputePermission;

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
        DisputePermission.CREATE,
        BuyerPermission.HOLD,
    ],
    superadmin: [
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
        DisputePermission.CREATE,
    ],
};
