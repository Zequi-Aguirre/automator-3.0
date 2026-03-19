// TICKET-131 — Zoe config data access (prompt + model management)
import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { ZoeConfig } from '../types/zoeTypes';

@injectable()
export default class ZoeConfigDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<ZoeConfig[]> {
        return this.db.manyOrNone<ZoeConfig>(`
            SELECT c.key, c.value, c.description, c.updated_at, u.name AS updated_by_name
            FROM zoe_config c
            LEFT JOIN users u ON c.updated_by = u.id
            ORDER BY c.key ASC
        `);
    }

    async getByKey(key: string): Promise<ZoeConfig | null> {
        return this.db.oneOrNone<ZoeConfig>(`
            SELECT key, value, description, updated_at, NULL AS updated_by_name
            FROM zoe_config WHERE key = $[key]
        `, { key });
    }

    async setValue(key: string, value: string, updatedBy: string | null): Promise<ZoeConfig> {
        return this.db.one<ZoeConfig>(`
            INSERT INTO zoe_config (key, value, updated_by, updated_at)
            VALUES ($[key], $[value], $[updatedBy], NOW())
            ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
            RETURNING key, value, description, updated_at, NULL AS updated_by_name
        `, { key, value, updatedBy });
    }
}
