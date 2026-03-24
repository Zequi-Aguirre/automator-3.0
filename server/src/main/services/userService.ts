import { randomBytes } from 'crypto';
import UserDAO from '../data/userDAO';
import RoleDAO from '../data/roleDAO';
import PasswordResetTokenDAO from '../data/passwordResetTokenDAO';
import EmailService from './emailService';
import { injectable } from "tsyringe";
import { AuthTokenResponse, User, UserCreateDTO, UserUpdateDTO, UserWithPermissions, AccountRequestDTO } from "../types/userTypes.ts";
import { AuthUtils } from "../middleware/tokenGenerator";
import { Permission, UserRole, ROLE_DEFAULT_PERMISSIONS, UserPermission } from '../types/permissionTypes';
import { userInviteEmail } from '../templates/emails/userInviteEmail';
import { passwordResetEmail } from '../templates/emails/passwordResetEmail';
import { accountRequestEmail } from '../templates/emails/accountRequestEmail';
import { EnvConfig } from '../config/envConfig';

@injectable()
export default class UserService {

    constructor(
        private readonly userDAO: UserDAO,
        private readonly roleDAO: RoleDAO,
        private readonly authUtils: AuthUtils,
        private readonly emailService: EmailService,
        private readonly passwordResetTokenDAO: PasswordResetTokenDAO,
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

    async createUser(dto: UserCreateDTO): Promise<{ user: User }> {
        const email = dto.email.toLowerCase().trim();

        const role = await this.roleDAO.getById(dto.role_id);
        if (!role) throw new Error('Role not found');

        // Locked placeholder — user must set password via magic link
        const lockedHash = await this.authUtils.hashPassword(randomBytes(32).toString('hex'));
        const user = await this.userDAO.create(email, dto.name, 'user', lockedHash);
        await this.userDAO.assignRole(user.id, dto.role_id, role.permissions);

        const setPasswordUrl = await this.generateResetToken(user.id);
        const { subject, html } = userInviteEmail({ name: dto.name, setPasswordUrl });
        await this.emailService.send({ to: email, subject, html });

        return { user };
    }

    async requestAccount(dto: AccountRequestDTO): Promise<{ user: User; priorDenials: number }> {
        const email = dto.email.toLowerCase().trim();

        const exists = await this.userDAO.emailExists(email);
        if (exists) throw new Error('An account with this email already exists or is pending.');

        const priorDenials = await this.userDAO.countPriorDenials(email);
        const user = await this.userDAO.createPending(email, dto.name);

        // Notify all users with users.approve permission
        const approvers = await this.userDAO.getUsersWithPermission(UserPermission.APPROVE);
        await Promise.all(approvers.map(async approver => {
            const { subject, html } = accountRequestEmail({
                requesterName: dto.name,
                requesterEmail: email,
                priorDenials,
            });
            try {
                await this.emailService.send({ to: approver.email, subject, html });
            } catch (err) {
                console.error(`Failed to notify approver ${approver.email}:`, err);
            }
        }));

        return { user, priorDenials };
    }

    async approveAccount(targetId: string, roleId: string): Promise<User | null> {
        const user = await this.userDAO.getOneById(targetId);
        if (!user || user.status !== 'pending') return null;

        const role = await this.roleDAO.getById(roleId);
        if (!role) throw new Error('Role not found');

        // Locked placeholder — user must set password via magic link
        const lockedHash = await this.authUtils.hashPassword(randomBytes(32).toString('hex'));
        await this.userDAO.updatePassword(targetId, lockedHash, false);
        await this.userDAO.updateStatus(targetId, 'active');
        await this.userDAO.assignRole(targetId, roleId, role.permissions);

        const setPasswordUrl = await this.generateResetToken(targetId);
        const { subject, html } = userInviteEmail({ name: user.name, setPasswordUrl });
        await this.emailService.send({ to: user.email, subject, html });

        return this.userDAO.getOneById(targetId);
    }

    async updateUser(userId: string, dto: UserUpdateDTO): Promise<User | null> {
        if (dto.email) dto.email = dto.email.toLowerCase().trim();
        return this.userDAO.update(userId, dto);
    }

    // Admin-initiated reset: send magic-link email
    async resetPassword(userId: string): Promise<void> {
        const user = await this.userDAO.getOneById(userId);
        if (!user) throw new Error('User not found');

        const setPasswordUrl = await this.generateResetToken(userId);
        const { subject, html } = passwordResetEmail({ name: user.name, setPasswordUrl });
        await this.emailService.send({ to: user.email, subject, html });
    }

    // Admin directly sets a user's password (no email sent)
    async adminSetPassword(userId: string, newPassword: string): Promise<void> {
        const hashedPassword = await this.authUtils.hashPassword(newPassword);
        await this.userDAO.updatePassword(userId, hashedPassword, false);
    }

    // User-initiated forgot-password: send magic-link email (silently does nothing if email not found)
    async requestPasswordReset(email: string): Promise<void> {
        email = email.toLowerCase().trim();
        const user = await this.userDAO.getUserByEmail(email);
        if (!user) return; // Don't reveal whether email exists

        const setPasswordUrl = await this.generateResetToken(user.id);
        const { subject, html } = passwordResetEmail({ name: user.name, setPasswordUrl });
        await this.emailService.send({ to: user.email, subject, html });
    }

    // Validate a reset token and set a new password
    async setPasswordWithToken(token: string, newPassword: string): Promise<void> {
        const record = await this.passwordResetTokenDAO.getByToken(token);
        if (!record) throw new Error('Invalid or expired reset link.');
        if (new Date() > record.expires) {
            await this.passwordResetTokenDAO.deleteByToken(token);
            throw new Error('Invalid or expired reset link.');
        }

        const hashedPassword = await this.authUtils.hashPassword(newPassword);
        await this.userDAO.updatePassword(record.user_id, hashedPassword, false);
        await this.passwordResetTokenDAO.deleteByToken(token);
    }

    async changePassword(userId: string, newPassword: string): Promise<void> {
        const hashedPassword = await this.authUtils.hashPassword(newPassword);
        await this.userDAO.updatePassword(userId, hashedPassword, false);
    }

    async denyAccount(targetId: string): Promise<boolean> {
        return this.userDAO.denyPending(targetId);
    }

    async updateNavbarOpen(userId: string, value: boolean): Promise<void> {
        await this.userDAO.updateNavbarOpen(userId, value);
    }

    async cleanExpiredResetTokens(): Promise<number> {
        return this.passwordResetTokenDAO.deleteExpired();
    }

    private async generateResetToken(userId: string): Promise<string> {
        const token = randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.passwordResetTokenDAO.create(userId, token, expires);
        return `${this.config.clientUrl}/set-password?token=${token}`;
    }
}
