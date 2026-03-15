import { Permission } from './permissionTypes';

export type User = {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin' | 'superadmin';
    permission_role_id?: string | null;
    permission_role_name?: string | null;
    permissions?: Permission[];
    must_change_password?: boolean;
};

export type UserWithPermissions = User & {
    permissions: Permission[];
};

export type AuthTokenResponse = {
    access_token: string;
    user: Partial<UserWithPermissions>;
};

export type UserCreateDTO = {
    email: string;
    name: string;
    role: 'user' | 'admin' | 'superadmin';
};

export type UserUpdateDTO = {
    name?: string;
    email?: string;
};