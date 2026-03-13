export type UserRole = 'user' | 'admin' | 'superadmin';

export enum Permission {
    LEADS_VERIFY = 'leads.verify',
    LEADS_QUEUE = 'leads.queue',
    LEADS_IMPORT = 'leads.import',
    LEADS_EXPORT = 'leads.export',
    LEADS_SEND = 'leads.send',
    LEADS_TRASH = 'leads.trash',
    LEADS_EDIT = 'leads.edit',
    LEADS_UNTRASH = 'leads.untrash',
    SOURCES_MANAGE = 'sources.manage',
    MANAGERS_MANAGE = 'managers.manage',
    BUYERS_MANAGE = 'buyers.manage',
    WORKER_TOGGLE = 'worker.toggle',
    SETTINGS_MANAGE = 'settings.manage',
    USERS_MANAGE = 'users.manage',
    ACTIVITY_VIEW = 'activity.view',
    TRASH_REASONS_MANAGE = 'trash_reasons.manage',
    DISPUTES_CREATE = 'disputes.create',
}

export type User = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    permissions?: Permission[];
};

export type Session = {
    access_token: string;
    user: {
        email: string;
        id: string;
        name: string;
    }
}
