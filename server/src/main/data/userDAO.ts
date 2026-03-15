import { injectable } from "tsyringe";
import { User } from "../types/userTypes.ts";
import { Permission } from "../types/permissionTypes.ts";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer.ts";

@injectable()
export default class UserDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getOneById(userId: string): Promise<(User & { permissions: Permission[] }) | null> {
        const row = await this.db.oneOrNone<{ id: string; name: string; email: string; role: string; permission_role_id: string | null; permission_role_name: string | null; permissions: string[]; must_change_password: boolean; status: string; navbar_open: boolean }>(
            `SELECT u.id, u.name, u.email, u.role, u.permission_role_id, u.must_change_password, u.status, u.navbar_open,
                    pr.name AS permission_role_name,
                    COALESCE(array_agg(up.permission) FILTER (WHERE up.permission IS NOT NULL), '{}') AS permissions
             FROM users u
             LEFT JOIN permission_roles pr ON pr.id = u.permission_role_id
             LEFT JOIN user_permissions up ON up.user_id = u.id
             WHERE u.id = $[userId]
             GROUP BY u.id, pr.name`,
            { userId }
        );
        if (!row) return null;
        return { ...row, role: row.role as User['role'], status: row.status as User['status'], permissions: row.permissions as Permission[] };
    }

    async getPermissions(userId: string): Promise<Permission[]> {
        const rows = await this.db.manyOrNone<{ permission: string }>(
            `SELECT permission FROM user_permissions WHERE user_id = $[userId]`,
            { userId }
        );
        return rows.map(r => r.permission as Permission);
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return this.db.oneOrNone<User>(
            `SELECT id, name, email, role, must_change_password, status FROM users WHERE email = $[email] AND deleted IS NULL AND status = 'active'`,
            { email }
        );
    }

    async getAll(): Promise<User[]> {
        return this.db.manyOrNone(
            `SELECT u.id, u.name, u.email, u.role, u.permission_role_id, u.must_change_password, u.status,
                    pr.name AS permission_role_name
             FROM users u
             LEFT JOIN permission_roles pr ON pr.id = u.permission_role_id
             WHERE u.deleted IS NULL
             ORDER BY u.status DESC, u.name`
        );
    }

    async create(email: string, name: string, role: string, hashedPassword: string): Promise<User> {
        return this.db.one<User>(
            `INSERT INTO users (email, name, role, encrypted_password, must_change_password, status, created, modified)
             VALUES ($[email], $[name], $[role], $[hashedPassword], true, 'active', NOW(), NOW())
             RETURNING id, name, email, role, must_change_password, status`,
            { email, name, role, hashedPassword }
        );
    }

    async createPending(email: string, name: string): Promise<User> {
        return this.db.one<User>(
            `INSERT INTO users (email, name, role, encrypted_password, must_change_password, status, created, modified)
             VALUES ($[email], $[name], 'user', '', false, 'pending', NOW(), NOW())
             RETURNING id, name, email, role, status`,
            { email, name }
        );
    }

    async updateStatus(userId: string, status: 'active' | 'pending'): Promise<void> {
        await this.db.none(
            `UPDATE users SET status = $[status], modified = NOW() WHERE id = $[userId]`,
            { userId, status }
        );
    }

    async getUsersWithPermission(permission: string): Promise<User[]> {
        return this.db.manyOrNone<User>(
            `SELECT u.id, u.name, u.email FROM users u
             JOIN user_permissions up ON up.user_id = u.id
             WHERE up.permission = $[permission] AND u.deleted IS NULL AND u.status = 'active'`,
            { permission }
        );
    }

    async update(userId: string, data: { name?: string; email?: string }): Promise<User | null> {
        const sets: string[] = [];
        if (data.name !== undefined) sets.push(`name = $[name]`);
        if (data.email !== undefined) sets.push(`email = $[email]`);
        if (sets.length === 0) return this.getOneById(userId);

        return this.db.oneOrNone<User>(
            `UPDATE users SET ${sets.join(', ')}, modified = NOW()
             WHERE id = $[userId] AND deleted IS NULL
             RETURNING id, name, email, role, must_change_password, status`,
            { ...data, userId }
        );
    }

    async assignRole(userId: string, roleId: string, permissions: Permission[]): Promise<void> {
        await this.db.tx(async t => {
            await t.none(
                `UPDATE users SET permission_role_id = $[roleId], modified = NOW() WHERE id = $[userId]`,
                { userId, roleId }
            );
            await t.none(`DELETE FROM user_permissions WHERE user_id = $[userId]`, { userId });
            if (permissions.length > 0) {
                await t.none(
                    `INSERT INTO user_permissions (user_id, permission) SELECT $[userId], unnest($[permissions]::text[])`,
                    { userId, permissions }
                );
            }
        });
    }

    async updateRole(userId: string, role: string): Promise<User | null> {
        return this.db.oneOrNone(
            `UPDATE users SET role = $[role], modified = NOW()
             WHERE id = $[userId] AND role != 'superadmin'
             RETURNING id, name, email, role`,
            { userId, role }
        );
    }

    async setPermissions(userId: string, permissions: Permission[]): Promise<void> {
        await this.db.tx(async t => {
            await t.none(`DELETE FROM user_permissions WHERE user_id = $[userId]`, { userId });
            if (permissions.length > 0) {
                await t.none(
                    `INSERT INTO user_permissions (user_id, permission)
                     SELECT $[userId], unnest($[permissions]::text[])`,
                    { userId, permissions }
                );
            }
        });
    }

    async getPasswordByEmail(email: string): Promise<{ encrypted_password: string } | null> {
        return this.db.oneOrNone<{ encrypted_password: string }>(
            `SELECT encrypted_password FROM users WHERE email = $[email] AND deleted IS NULL AND status = 'active'`,
            { email }
        );
    }

    async updatePassword(userId: string, hashedPassword: string, mustChangePassword: boolean): Promise<void> {
        await this.db.none(
            `UPDATE users SET encrypted_password = $[hashedPassword], must_change_password = $[mustChangePassword], modified = NOW()
             WHERE id = $[userId]`,
            { userId, hashedPassword, mustChangePassword }
        );
    }

    async setMustChangePassword(userId: string, value: boolean): Promise<void> {
        await this.db.none(
            `UPDATE users SET must_change_password = $[value], modified = NOW() WHERE id = $[userId]`,
            { userId, value }
        );
    }

    async updateNavbarOpen(userId: string, value: boolean): Promise<void> {
        await this.db.none(
            `UPDATE users SET navbar_open = $[value], modified = NOW() WHERE id = $[userId]`,
            { userId, value }
        );
    }

    async denyPending(userId: string): Promise<boolean> {
        const result = await this.db.result(
            `UPDATE users SET deleted = NOW(), modified = NOW() WHERE id = $[userId] AND status = 'pending'`,
            { userId }
        );
        return result.rowCount > 0;
    }

    async emailExists(email: string): Promise<boolean> {
        const row = await this.db.oneOrNone<{ count: string }>(
            `SELECT COUNT(*) AS count FROM users WHERE email = $[email] AND deleted IS NULL`,
            { email }
        );
        return parseInt(row?.count ?? '0', 10) > 0;
    }

    async countPriorDenials(email: string): Promise<number> {
        const row = await this.db.oneOrNone<{ count: string }>(
            `SELECT COUNT(*) AS count FROM users WHERE email = $[email] AND deleted IS NOT NULL AND status = 'pending'`,
            { email }
        );
        return parseInt(row?.count ?? '0', 10);
    }
}
