import { injectable } from "tsyringe";
import { User } from "../types/userTypes.ts";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer.ts";

@injectable()
export default class UserDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getOneById(userId: string): Promise<User | null> {
        const userQuery = `
            SELECT 
                u.id,
                u.name,
                u.email,
                u.role
            FROM 
                users u
            WHERE 
                u.id = $[userId]
        `;

        const params = { userId };
        return await this.db.oneOrNone(userQuery, params);
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const query = `
            SELECT 
                id, 
                name, 
                email, 
                role 
            FROM 
                users 
            WHERE 
                email = $[email]
        `;

        const params = { email };
        return await this.db.oneOrNone<User>(query, params);
    }

    async getAll(): Promise<User[]> {
        return this.db.manyOrNone(`SELECT id, name, email, role FROM users WHERE deleted IS NULL ORDER BY name`);
    }

    async updateRole(userId: string, role: string): Promise<User | null> {
        return this.db.oneOrNone(
            `UPDATE users SET role = $[role], modified = NOW() WHERE id = $[userId] AND role != 'superadmin' RETURNING id, name, email, role`,
            { userId, role }
        );
    }

    async getPasswordByEmail(email: string): Promise<{ encrypted_password: string } | null> {
        const query = `
            SELECT 
                encrypted_password
            FROM 
                users
            WHERE 
                email = $[email]
        `;

        const params = { email };
        return await this.db.oneOrNone<{ encrypted_password: string }>(query, params);
    }
}