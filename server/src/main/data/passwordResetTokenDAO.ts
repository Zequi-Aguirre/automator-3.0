import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer.ts';

export type PasswordResetToken = {
    id: string;
    user_id: string;
    token: string;
    created: Date;
    expires: Date;
};

@injectable()
export default class PasswordResetTokenDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async create(userId: string, token: string, expires: Date): Promise<void> {
        // One active token per user — revoke any existing ones first
        await this.db.none(`DELETE FROM password_reset_tokens WHERE user_id = $[userId]`, { userId });
        await this.db.none(
            `INSERT INTO password_reset_tokens (user_id, token, expires)
             VALUES ($[userId], $[token], $[expires])`,
            { userId, token, expires }
        );
    }

    async getByToken(token: string): Promise<PasswordResetToken | null> {
        return this.db.oneOrNone<PasswordResetToken>(
            `SELECT id, user_id, token, created, expires
             FROM password_reset_tokens
             WHERE token = $[token]`,
            { token }
        );
    }

    async deleteByToken(token: string): Promise<void> {
        await this.db.none(`DELETE FROM password_reset_tokens WHERE token = $[token]`, { token });
    }

    async deleteExpired(): Promise<number> {
        const result = await this.db.result(
            `DELETE FROM password_reset_tokens WHERE expires < NOW()`
        );
        return result.rowCount;
    }
}
