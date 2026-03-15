export type UserRole = 'user' | 'admin' | 'superadmin';

export enum Permission {
    LEADS_READ = 'leads.read',
    LEADS_VERIFY = 'leads.verify',
    LEADS_QUEUE = 'leads.queue',
    LEADS_IMPORT = 'leads.import',
    LEADS_EXPORT = 'leads.export',
    LEADS_SEND = 'leads.send',
    LEADS_TRASH = 'leads.trash',
    LEADS_EDIT = 'leads.edit',
    LEADS_UNTRASH = 'leads.untrash',
    LEADS_CALL_REQUEST = 'leads.call_request',
    LEADS_CALL_EXECUTE = 'leads.call_execute',
    SOURCES_MANAGE = 'sources.manage',
    MANAGERS_MANAGE = 'managers.manage',
    BUYERS_MANAGE = 'buyers.manage',
    WORKER_SETTINGS_TOGGLE = 'worker.toggle',
    WORKER_SETTINGS_MANAGE = 'settings.manage',
    COUNTIES_MANAGE = 'counties.manage',
    LOGS_VIEW = 'logs.view',
    USERS_MANAGE = 'users.manage',
    USERS_APPROVE = 'users.approve',
    ACTIVITY_VIEW = 'activity.view',
    TRASH_REASONS_MANAGE = 'trash_reasons.manage',
    DISPUTES_CREATE = 'disputes.create',
}

export type User = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    permission_role_id?: string | null;
    permission_role_name?: string | null;
    permissions?: Permission[];
    must_change_password?: boolean;
    status?: 'active' | 'pending';
    navbar_open?: boolean;
};

export type UserCreateDTO = {
    email: string;
    name: string;
    role_id: string;
};

export type UserUpdateDTO = {
    name?: string;
    email?: string;
};

export type AccountRequestDTO = {
    email: string;
    name: string;
};

export type Session = {
    access_token: string;
    user: {
        email: string;
        id: string;
        name: string;
    }
}
