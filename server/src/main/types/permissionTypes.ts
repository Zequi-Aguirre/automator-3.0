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
        SourcePermission.MANAGE,
        ManagerPermission.MANAGE,
        CountyPermission.MANAGE,
        LogPermission.VIEW,
        ActivityPermission.VIEW,
        TrashReasonPermission.MANAGE,
        DisputePermission.CREATE,
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
        SourcePermission.MANAGE,
        ManagerPermission.MANAGE,
        BuyerPermission.MANAGE,
        CountyPermission.MANAGE,
        LogPermission.VIEW,
        WorkerSettingsPermission.TOGGLE,
        WorkerSettingsPermission.MANAGE,
        UserPermission.MANAGE,
        ActivityPermission.VIEW,
        TrashReasonPermission.MANAGE,
        DisputePermission.CREATE,
    ],
};
