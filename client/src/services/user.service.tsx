import { User, Permission } from "../types/userTypes";
import { authProvider, AxiosProvider } from "../config/axiosProvider.ts";

class UserService {
    constructor(private readonly api : AxiosProvider) {}

    authenticateUser = async (email: string, password: string): Promise<{ access_token : string, user: User, role: string }> => {
        // getApi(false) means we don't need to send the token in the header
        return await this.api.getApi(false).post('/api/authenticate', { email, password }).then(async (response) => {
            const token = response.data.access_token;
            this.api.setToken(token);
            return {
                role: response.data.user.role,
                ...response.data
            };
        })
    }

    getUserInfo = async (): Promise<User> => {
        return await this.api.getApi().get('/api/users/info').then((response) => response.data);
    }

    signOut = (): { message: string } => {
        this.api.removeToken(); // Remove the token from localStorage
        return { message: 'success' };
    }

    getAllUsers = async (): Promise<User[]> => {
        const res = await this.api.getApi().get('/api/users/admin/users');
        return res.data;
    }

    updateRole = async (userId: string, role: 'user' | 'admin'): Promise<User> => {
        const res = await this.api.getApi().patch(`/api/users/admin/users/${userId}/role`, { role });
        return res.data;
    }

    setPermissions = async (userId: string, permissions: Permission[]): Promise<void> => {
        await this.api.getApi().put(`/api/users/admin/users/${userId}/permissions`, { permissions });
    }

    getAvailablePermissions = async (): Promise<Record<string, string[]>> => {
        const res = await this.api.getApi().get('/api/users/admin/permissions');
        return res.data;
    }

    getUserById = async (id: string): Promise<User> => {
        const res = await this.api.getApi().get(`/api/users/admin/users/${id}`);
        return res.data;
    }

    assignRole = async (userId: string, roleId: string): Promise<User & { permissions: Permission[] }> => {
        const res = await this.api.getApi().patch(`/api/users/admin/users/${userId}/assign-role`, { role_id: roleId });
        return res.data;
    }
}

const userService = new UserService(authProvider);

export default userService;
