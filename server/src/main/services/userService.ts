import UserDAO from '../data/userDAO';
import RoleDAO from '../data/roleDAO';
import EmailService from './emailService';
import { injectable } from "tsyringe";
import { AuthTokenResponse, User, UserCreateDTO, UserUpdateDTO, UserWithPermissions, AccountRequestDTO } from "../types/userTypes.ts";
import { AuthUtils } from "../middleware/tokenGenerator";
import { Permission, UserRole, ROLE_DEFAULT_PERMISSIONS, UserPermission } from '../types/permissionTypes';
import { userInviteEmail } from '../templates/emails/userInviteEmail';
import { passwordResetEmail } from '../templates/emails/passwordResetEmail';
import { accountRequestEmail } from '../templates/emails/accountRequestEmail';

@injectable()
export default class UserService {

    constructor(
        private readonly userDAO: UserDAO,
        private readonly roleDAO: RoleDAO,
        private readonly authUtils: AuthUtils,
        private readonly emailService: EmailService,
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

        const role = await this.roleDAO.getById(dto.role_id);
        if (!role) throw new Error('Role not found');

        const tempPassword = this.generateTempPassword();
        const hashedPassword = await this.authUtils.hashPassword(tempPassword);

        // Create with base role 'user' — permissions are driven by permission_role
        const user = await this.userDAO.create(email, dto.name, 'user', hashedPassword);
        await this.userDAO.assignRole(user.id, dto.role_id, role.permissions);

        const { subject, html } = userInviteEmail({ name: dto.name, email, tempPassword });
        await this.emailService.send({ to: email, subject, html });

        return { user, tempPassword };
    }

    async requestAccount(dto: AccountRequestDTO): Promise<User> {
        const email = dto.email.toLowerCase().trim();

        const exists = await this.userDAO.emailExists(email);
        if (exists) throw new Error('An account with this email already exists or is pending.');

        const user = await this.userDAO.createPending(email, dto.name);

        // Notify all users with users.approve permission
        const approvers = await this.userDAO.getUsersWithPermission(UserPermission.APPROVE);
        await Promise.all(approvers.map(async approver => {
            const { subject, html } = accountRequestEmail({
                requesterName: dto.name,
                requesterEmail: email,
            });
            try {
                await this.emailService.send({ to: approver.email, subject, html });
            } catch (err) {
                console.error(`Failed to notify approver ${approver.email}:`, err);
            }
        }));

        return user;
    }

    async approveAccount(targetId: string, roleId: string): Promise<User | null> {
        const user = await this.userDAO.getOneById(targetId);
        if (!user || user.status !== 'pending') return null;

        const role = await this.roleDAO.getById(roleId);
        if (!role) throw new Error('Role not found');

        const tempPassword = this.generateTempPassword();
        const hashedPassword = await this.authUtils.hashPassword(tempPassword);

        await this.userDAO.updatePassword(targetId, hashedPassword, true);
        await this.userDAO.updateStatus(targetId, 'active');
        await this.userDAO.assignRole(targetId, roleId, role.permissions);

        const { subject, html } = userInviteEmail({ name: user.name, email: user.email, tempPassword });
        await this.emailService.send({ to: user.email, subject, html });

        return this.userDAO.getOneById(targetId);
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

        const { subject, html } = passwordResetEmail({ name: user.name, email: user.email, tempPassword });
        await this.emailService.send({ to: user.email, subject, html });
    }

    async changePassword(userId: string, newPassword: string): Promise<void> {
        const hashedPassword = await this.authUtils.hashPassword(newPassword);
        await this.userDAO.updatePassword(userId, hashedPassword, false);
    }

    async updateNavbarOpen(userId: string, value: boolean): Promise<void> {
        await this.userDAO.updateNavbarOpen(userId, value);
    }

    private generateTempPassword(): string {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let result = '';
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
