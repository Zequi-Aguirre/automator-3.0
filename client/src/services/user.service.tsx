import { User, Permission, UserCreateDTO, UserUpdateDTO, AccountRequestDTO } from "../types/userTypes";
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
        const res = await this.api.getApi().get('/api/users/users');
        return res.data;
    }

    updateRole = async (userId: string, role: 'user' | 'admin'): Promise<User> => {
        const res = await this.api.getApi().patch(`/api/users/users/${userId}/role`, { role });
        return res.data;
    }

    setPermissions = async (userId: string, permissions: Permission[]): Promise<void> => {
        await this.api.getApi().put(`/api/users/users/${userId}/permissions`, { permissions });
    }

    getAvailablePermissions = async (): Promise<Record<string, string[]>> => {
        const res = await this.api.getApi().get('/api/users/permissions');
        return res.data;
    }

    getUserById = async (id: string): Promise<User> => {
        const res = await this.api.getApi().get(`/api/users/users/${id}`);
        return res.data;
    }

    assignRole = async (userId: string, roleId: string): Promise<User & { permissions: Permission[] }> => {
        const res = await this.api.getApi().patch(`/api/users/users/${userId}/assign-role`, { role_id: roleId });
        return res.data;
    }

    createUser = async (dto: UserCreateDTO): Promise<User> => {
        const res = await this.api.getApi().post('/api/users/users', dto);
        return res.data;
    }

    updateUser = async (userId: string, dto: UserUpdateDTO): Promise<User> => {
        const res = await this.api.getApi().patch(`/api/users/users/${userId}`, dto);
        return res.data;
    }

    resetPassword = async (userId: string): Promise<void> => {
        await this.api.getApi().post(`/api/users/users/${userId}/reset-password`);
    }

    changePassword = async (newPassword: string): Promise<void> => {
        await this.api.getApi().post('/api/users/change-password', { new_password: newPassword });
    }

    requestAccount = async (dto: AccountRequestDTO): Promise<void> => {
        await this.api.getApi(false).post('/api/authenticate/request-account', dto);
    }

    forgotPassword = async (email: string): Promise<void> => {
        await this.api.getApi(false).post('/api/authenticate/forgot-password', { email });
    }

    setPasswordWithToken = async (token: string, newPassword: string): Promise<void> => {
        await this.api.getApi(false).post('/api/authenticate/set-password-token', { token, new_password: newPassword });
    }

    adminSetPassword = async (userId: string, newPassword: string): Promise<void> => {
        await this.api.getApi().post(`/api/users/users/${userId}/set-password`, { new_password: newPassword });
    }

    denyAccount = async (userId: string): Promise<void> => {
        await this.api.getApi().post(`/api/users/users/${userId}/deny`);
    }

    approveAccount = async (userId: string, roleId: string): Promise<User> => {
        const res = await this.api.getApi().post(`/api/users/users/${userId}/approve`, { role_id: roleId });
        return res.data;
    }

    updateNavbarOpen = async (value: boolean): Promise<void> => {
        await this.api.getApi().patch('/api/users/me/navbar', { navbar_open: value });
    }
}

const userService = new UserService(authProvider);

export default userService;
