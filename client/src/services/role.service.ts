import { authProvider } from '../config/axiosProvider';
import { PermissionRole } from '../types/roleTypes';
import { Permission } from '../types/userTypes';

const BASE = '/api/roles';

const roleService = {
    getAll: async (): Promise<PermissionRole[]> => {
        const res = await authProvider.getApi().get<PermissionRole[]>(BASE);
        return res.data;
    },

    create: async (name: string, permissions: Permission[]): Promise<PermissionRole> => {
        const res = await authProvider.getApi().post<PermissionRole>(BASE, { name, permissions });
        return res.data;
    },

    update: async (id: string, name: string, permissions: Permission[]): Promise<PermissionRole> => {
        const res = await authProvider.getApi().put<PermissionRole>(`${BASE}/${id}`, { name, permissions });
        return res.data;
    },

    delete: async (id: string): Promise<void> => {
        await authProvider.getApi().delete(`${BASE}/${id}`);
    },
};

export default roleService;
