import UserDAO from '../data/userDAO';
import { injectable } from "tsyringe";
import { AuthTokenResponse, User, UserWithPermissions } from "../types/userTypes.ts";
import { AuthUtils } from "../middleware/tokenGenerator";
import { UserRole, getEffectivePermissions } from '../types/permissionTypes';

@injectable()
export default class UserService {

    constructor(
        private readonly userDAO: UserDAO,
        private readonly authUtils: AuthUtils,
    ) {}

    async authenticate(email: string, password: string): Promise<AuthTokenResponse | null> {
        email = email.toLowerCase();
        const userPassword = await this.userDAO.getPasswordByEmail(email);
        if (!userPassword) {
            return null;
        }

        const passwordMatch = await this.authUtils.comparePassword(password, userPassword!.encrypted_password);
        if (!passwordMatch) {
            return null;
        }

        const user = await this.userDAO.getUserByEmail(email);
        const token = this.authUtils.generateToken({ id: user!.id, role: user!.role });
        return { access_token: token, user: user! };
    }

    async getUserById(userId: string): Promise<UserWithPermissions | null> {
        const user = await this.userDAO.getOneById(userId);
        if (!user) return null;
        return { ...user, permissions: getEffectivePermissions(user.role as UserRole) };
    }

    async getAllUsers(): Promise<User[]> {
        return this.userDAO.getAll();
    }

    async updateUserRole(targetId: string, newRole: 'user' | 'admin', requestingRole: UserRole): Promise<User | null> {
        // Only superadmin can promote to admin; admins can only set user/admin if they have users.manage
        if (newRole === 'admin' && requestingRole !== 'superadmin') {
            return null;
        }
        return this.userDAO.updateRole(targetId, newRole);
    }
}
