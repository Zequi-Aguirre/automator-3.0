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
    | DisputePermission;

export type UserRole = 'user' | 'admin' | 'superadmin';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    user: [
        LeadPermission.READ,
        LeadPermission.VERIFY,
        LeadPermission.QUEUE,
        LeadPermission.EDIT,
        LeadPermission.CALL_REQUEST,
        LeadPermission.CALL_EXECUTE,
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
        SourcePermission.MANAGE,
        ManagerPermission.MANAGE,
        CountyPermission.MANAGE,
        LogPermission.VIEW,
        ActivityPermission.VIEW,
        TrashReasonPermission.MANAGE,
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
        DisputePermission.CREATE,
    ],
};
