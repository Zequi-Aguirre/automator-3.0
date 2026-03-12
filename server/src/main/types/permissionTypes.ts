export enum LeadPermission {
    VERIFY = 'leads.verify',
    QUEUE = 'leads.queue',
    IMPORT = 'leads.import',
    EXPORT = 'leads.export',
    SEND = 'leads.send',
    TRASH = 'leads.trash',
    EDIT = 'leads.edit',
    UNTRASH = 'leads.untrash',
}

export enum WorkerPermission {
    TOGGLE = 'worker.toggle',
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

export enum SettingsPermission {
    MANAGE = 'settings.manage',
}

export enum UserPermission {
    MANAGE = 'users.manage',
}

export enum ActivityPermission {
    VIEW = 'activity.view',
}

export type Permission =
    | LeadPermission
    | WorkerPermission
    | SourcePermission
    | BuyerPermission
    | ManagerPermission
    | SettingsPermission
    | UserPermission
    | ActivityPermission;

export type UserRole = 'user' | 'admin' | 'superadmin';

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    user: [
        LeadPermission.VERIFY,
        LeadPermission.QUEUE,
        LeadPermission.EDIT,
        ActivityPermission.VIEW,
    ],
    admin: [
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
        ActivityPermission.VIEW,
    ],
    superadmin: [
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
        WorkerPermission.TOGGLE,
        SettingsPermission.MANAGE,
        UserPermission.MANAGE,
        ActivityPermission.VIEW,
    ],
};
