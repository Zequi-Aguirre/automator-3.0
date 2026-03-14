import { Permission } from './permissionTypes';

export type PermissionRole = {
    id: string;
    name: string;
    permissions: Permission[];
    created: string;
    updated: string;
};
