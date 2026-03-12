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
        const row = await this.db.oneOrNone<{ id: string; name: string; email: string; role: string; permissions: string[] }>(
            `SELECT u.id, u.name, u.email, u.role,
                    COALESCE(array_agg(up.permission) FILTER (WHERE up.permission IS NOT NULL), '{}') AS permissions
             FROM users u
             LEFT JOIN user_permissions up ON up.user_id = u.id
             WHERE u.id = $[userId]
             GROUP BY u.id`,
            { userId }
        );
        if (!row) return null;
        return { ...row, role: row.role as User['role'], permissions: row.permissions as Permission[] };
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
            `SELECT id, name, email, role FROM users WHERE email = $[email]`,
            { email }
        );
    }

    async getAll(): Promise<User[]> {
        return this.db.manyOrNone(
            `SELECT id, name, email, role FROM users WHERE deleted IS NULL ORDER BY name`
        );
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
            `SELECT encrypted_password FROM users WHERE email = $[email]`,
            { email }
        );
    }
}
