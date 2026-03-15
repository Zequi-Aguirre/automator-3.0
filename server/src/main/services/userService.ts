import UserDAO from '../data/userDAO';
import RoleDAO from '../data/roleDAO';
import { injectable } from "tsyringe";
import { AuthTokenResponse, User, UserWithPermissions } from "../types/userTypes.ts";
import { AuthUtils } from "../middleware/tokenGenerator";
import { Permission, UserRole, ROLE_DEFAULT_PERMISSIONS } from '../types/permissionTypes';

@injectable()
export default class UserService {

    constructor(
        private readonly userDAO: UserDAO,
        private readonly roleDAO: RoleDAO,
        private readonly authUtils: AuthUtils,
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
}
