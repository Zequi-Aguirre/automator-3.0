export enum Permission {
    LEADS_VERIFY = 'leads.verify',
    LEADS_QUEUE = 'leads.queue',
    LEADS_IMPORT = 'leads.import',
    LEADS_EXPORT = 'leads.export',
    LEADS_SEND = 'leads.send',
    LEADS_TRASH = 'leads.trash',
    SOURCES_MANAGE = 'sources.manage',
    MANAGERS_MANAGE = 'managers.manage',
    BUYERS_MANAGE = 'buyers.manage',
    WORKER_TOGGLE = 'worker.toggle',
    SETTINGS_MANAGE = 'settings.manage',
    USERS_MANAGE = 'users.manage',
}

export type UserRole = 'user' | 'admin' | 'superadmin';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    user: [
        Permission.LEADS_VERIFY,
        Permission.LEADS_QUEUE,
    ],
    admin: [
        Permission.LEADS_VERIFY,
        Permission.LEADS_QUEUE,
        Permission.LEADS_IMPORT,
        Permission.LEADS_EXPORT,
        Permission.LEADS_SEND,
        Permission.LEADS_TRASH,
        Permission.SOURCES_MANAGE,
        Permission.MANAGERS_MANAGE,
    ],
    superadmin: [
        Permission.LEADS_VERIFY,
        Permission.LEADS_QUEUE,
        Permission.LEADS_IMPORT,
        Permission.LEADS_EXPORT,
        Permission.LEADS_SEND,
        Permission.LEADS_TRASH,
        Permission.SOURCES_MANAGE,
        Permission.MANAGERS_MANAGE,
        Permission.BUYERS_MANAGE,
        Permission.WORKER_TOGGLE,
        Permission.SETTINGS_MANAGE,
        Permission.USERS_MANAGE,
    ],
};

export function getEffectivePermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user;
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
    return getEffectivePermissions(role).includes(permission);
}
