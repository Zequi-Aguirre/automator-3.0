import UserDAO from '../data/userDAO';
import RoleDAO from '../data/roleDAO';
import { injectable } from "tsyringe";
import { AuthTokenResponse, User, UserCreateDTO, UserUpdateDTO, UserWithPermissions } from "../types/userTypes.ts";
import { AuthUtils } from "../middleware/tokenGenerator";
import { Permission, UserRole, ROLE_DEFAULT_PERMISSIONS } from '../types/permissionTypes';
import { EnvConfig } from '../config/envConfig';
import axios from 'axios';

@injectable()
export default class UserService {

    constructor(
        private readonly userDAO: UserDAO,
        private readonly roleDAO: RoleDAO,
        private readonly authUtils: AuthUtils,
        private readonly config: EnvConfig,
    ) {}

    async authenticate(email: string, password: string): Promise<AuthTokenResponse | null> {
        email = email.toLowerCase();
        const userPassword = await this.userDAO.getPasswordByEmail(email);
        if (!userPassword) return null;

        const passwordMatch = await this.authUtils.comparePassword(password, userPassword.encrypted_password);
        if (!passwordMatch) return null;

        const user = await this.userDAO.getUserByEmail(email);
        const permissions = await this.userDAO.getPermissions(user!.id);
        const token = this.authUtils.generateToken({ id: user!.id, role: user!.role });
        return { access_token: token, user: { ...user!, permissions } };
    }

    async getUserById(userId: string): Promise<UserWithPermissions | null> {
        const user = await this.userDAO.getOneById(userId);
        if (!user) return null;
        const permissions = await this.userDAO.getPermissions(userId);
        return { ...user, permissions };
    }

    async getAllUsers(): Promise<(User & { permissions: Permission[] })[]> {
        const users = await this.userDAO.getAll();
        return Promise.all(users.map(async u => ({
            ...u,
            permissions: await this.userDAO.getPermissions(u.id),
        })));
    }

    async updateUserRole(targetId: string, newRole: 'user' | 'admin', requestingRole: UserRole): Promise<User | null> {
        if (newRole === 'admin' && requestingRole !== 'superadmin') return null;
        const updated = await this.userDAO.updateRole(targetId, newRole);
        if (!updated) return null;
        // Reset permissions to the new role's defaults
        await this.userDAO.setPermissions(targetId, ROLE_DEFAULT_PERMISSIONS[newRole]);
        return updated;
    }

    async setUserPermissions(targetId: string, permissions: Permission[], requestingRole: UserRole): Promise<boolean> {
        if (requestingRole !== 'superadmin') return false;
        await this.userDAO.setPermissions(targetId, permissions);
        return true;
    }

    async assignRole(targetId: string, roleId: string): Promise<(User & { permissions: Permission[] }) | null> {
        const role = await this.roleDAO.getById(roleId);
        if (!role) return null;
        await this.userDAO.assignRole(targetId, roleId, role.permissions);
        return this.userDAO.getOneById(targetId);
    }

    async createUser(dto: UserCreateDTO): Promise<{ user: User; tempPassword: string }> {
        const email = dto.email.toLowerCase().trim();
        const tempPassword = this.generateTempPassword();
        const hashedPassword = await this.authUtils.hashPassword(tempPassword);

        const user = await this.userDAO.create(email, dto.name, dto.role, hashedPassword);

        // Assign default permissions for role
        const defaultPerms = ROLE_DEFAULT_PERMISSIONS[dto.role] ?? [];
        if (defaultPerms.length > 0) {
            await this.userDAO.setPermissions(user.id, defaultPerms);
        }

        await this.sendUserEmail({ action: 'invite_user', name: dto.name, email, tempPassword });

        return { user, tempPassword };
    }

    async updateUser(userId: string, dto: UserUpdateDTO): Promise<User | null> {
        if (dto.email) dto.email = dto.email.toLowerCase().trim();
        return this.userDAO.update(userId, dto);
    }

    async resetPassword(userId: string): Promise<void> {
        const user = await this.userDAO.getOneById(userId);
        if (!user) throw new Error('User not found');

        const tempPassword = this.generateTempPassword();
        const hashedPassword = await this.authUtils.hashPassword(tempPassword);

        await this.userDAO.updatePassword(userId, hashedPassword, true);
        await this.sendUserEmail({ action: 'reset_password', name: user.name, email: user.email, tempPassword });
    }

    async changePassword(userId: string, newPassword: string): Promise<void> {
        const hashedPassword = await this.authUtils.hashPassword(newPassword);
        await this.userDAO.updatePassword(userId, hashedPassword, false);
    }

    private generateTempPassword(): string {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let result = '';
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private async sendUserEmail(payload: {
        action: 'invite_user' | 'reset_password';
        name: string;
        email: string;
        tempPassword: string;
    }): Promise<void> {
        if (!this.config.makeUserWebhookUrl) {
            console.warn('[UserService] MAKE_USER_WEBHOOK_URL not set — skipping email send');
            return;
        }
        try {
            await axios.post(this.config.makeUserWebhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            });
        } catch (err) {
            console.error('[UserService] Failed to send user email via Make.com:', err);
        }
    }
}
