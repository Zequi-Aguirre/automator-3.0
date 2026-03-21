// TICKET-130 — Zoe API key data access
import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { ZoeApiKey } from '../types/zoeTypes';

@injectable()
export default class ZoeKeyDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<ZoeApiKey[]> {
        return this.db.manyOrNone<ZoeApiKey>(`
            SELECT
                k.id, k.name, k.active, k.last_used_at, k.created, k.revoked_at,
                u.name AS created_by_name
            FROM zoe_api_keys k
            LEFT JOIN users u ON k.created_by = u.id
            ORDER BY k.created DESC
        `);
    }

    async getByHash(keyHash: string): Promise<ZoeApiKey | null> {
        return this.db.oneOrNone<ZoeApiKey>(`
            SELECT id, name, active, last_used_at, created, revoked_at, NULL AS created_by_name
            FROM zoe_api_keys
            WHERE key_hash = $[keyHash] AND active = true
        `, { keyHash });
    }

    async create(name: string, keyHash: string, createdBy: string | null): Promise<ZoeApiKey> {
        return this.db.one<ZoeApiKey>(`
            INSERT INTO zoe_api_keys (name, key_hash, created_by)
            VALUES ($[name], $[keyHash], $[createdBy])
            RETURNING id, name, active, last_used_at, created, revoked_at, NULL AS created_by_name
        `, { name, keyHash, createdBy });
    }

    async revoke(id: string): Promise<ZoeApiKey> {
        return this.db.one<ZoeApiKey>(`
            UPDATE zoe_api_keys
            SET active = false, revoked_at = NOW()
            WHERE id = $[id]
            RETURNING id, name, active, last_used_at, created, revoked_at, NULL AS created_by_name
        `, { id });
    }

    async touchLastUsed(id: string): Promise<void> {
        await this.db.none(`
            UPDATE zoe_api_keys SET last_used_at = NOW() WHERE id = $[id]
        `, { id });
    }
}
