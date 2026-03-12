import { Permission } from './permissionTypes';

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superadmin';
};

export type UserWithPermissions = User & {
    permissions: Permission[];
};

export type AuthTokenResponse = {
    access_token: string;
    user: Partial<UserWithPermissions>;
};