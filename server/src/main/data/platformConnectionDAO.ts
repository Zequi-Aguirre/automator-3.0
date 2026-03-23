import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { PlatformConnection, PlatformConnectionCreateDTO, PlatformConnectionUpdateDTO } from '../types/platformConnectionTypes';

@injectable()
export default class PlatformConnectionDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<PlatformConnection[]> {
        return this.db.manyOrNone<PlatformConnection>(`
            SELECT id, label, host, port, dbname, db_username,
                   lookback_days, is_active, automator_buyer_id, last_synced_at, created, modified, deleted
            FROM platform_connections
            WHERE deleted IS NULL
            ORDER BY label ASC, created ASC
        `);
    }

    async getById(id: string): Promise<PlatformConnection | null> {
        return this.db.oneOrNone<PlatformConnection>(`
            SELECT id, label, host, port, dbname, db_username,
                   lookback_days, is_active, automator_buyer_id, last_synced_at, created, modified, deleted
            FROM platform_connections
            WHERE id = $[id] AND deleted IS NULL
        `, { id });
    }

    async getByIdWithPassword(id: string): Promise<(PlatformConnection & { encrypted_password: string }) | null> {
        return this.db.oneOrNone<PlatformConnection & { encrypted_password: string }>(`
            SELECT * FROM platform_connections
            WHERE id = $[id] AND deleted IS NULL
        `, { id });
    }

    async getActiveConnections(): Promise<(PlatformConnection & { encrypted_password: string })[]> {
        return this.db.manyOrNone<PlatformConnection & { encrypted_password: string }>(`
            SELECT * FROM platform_connections
            WHERE deleted IS NULL AND is_active = TRUE
            ORDER BY label ASC, created ASC
        `);
    }

    async create(dto: PlatformConnectionCreateDTO, encryptedPassword: string): Promise<PlatformConnection> {
        return this.db.one<PlatformConnection>(`
            INSERT INTO platform_connections (label, host, port, dbname, db_username, encrypted_password, lookback_days, automator_buyer_id)
            VALUES ($[label], $[host], $[port], $[dbname], $[db_username], $[encrypted_password], $[lookback_days], $[automator_buyer_id])
            RETURNING id, label, host, port, dbname, db_username,
                      lookback_days, is_active, automator_buyer_id, last_synced_at, created, modified, deleted
        `, {
            label: dto.label ?? null,
            host: dto.host,
            port: dto.port ?? 5432,
            dbname: dto.dbname,
            db_username: dto.db_username,
            encrypted_password: encryptedPassword,
            lookback_days: dto.lookback_days ?? 30,
            automator_buyer_id: dto.automator_buyer_id ?? null,
        });
    }

    async update(id: string, dto: PlatformConnectionUpdateDTO, encryptedPassword?: string): Promise<PlatformConnection> {
        const sets: string[] = ['modified = NOW()'];
        const params: Record<string, unknown> = { id };

        if (dto.label !== undefined)              { sets.push('label = $[label]'); params.label = dto.label; }
        if (dto.host !== undefined)               { sets.push('host = $[host]'); params.host = dto.host; }
        if (dto.port !== undefined)               { sets.push('port = $[port]'); params.port = dto.port; }
        if (dto.dbname !== undefined)             { sets.push('dbname = $[dbname]'); params.dbname = dto.dbname; }
        if (dto.db_username !== undefined)        { sets.push('db_username = $[db_username]'); params.db_username = dto.db_username; }
        if (dto.lookback_days !== undefined)      { sets.push('lookback_days = $[lookback_days]'); params.lookback_days = dto.lookback_days; }
        if (dto.is_active !== undefined)          { sets.push('is_active = $[is_active]'); params.is_active = dto.is_active; }
        if (dto.automator_buyer_id !== undefined) { sets.push('automator_buyer_id = $[automator_buyer_id]'); params.automator_buyer_id = dto.automator_buyer_id; }
        if (encryptedPassword !== undefined)      { sets.push('encrypted_password = $[encrypted_password]'); params.encrypted_password = encryptedPassword; }

        return this.db.one<PlatformConnection>(`
            UPDATE platform_connections SET ${sets.join(', ')}
            WHERE id = $[id] AND deleted IS NULL
            RETURNING id, label, host, port, dbname, db_username,
                      lookback_days, is_active, automator_buyer_id, last_synced_at, created, modified, deleted
        `, params);
    }

    async updateLastSynced(id: string): Promise<void> {
        await this.db.none(`
            UPDATE platform_connections SET last_synced_at = NOW(), modified = NOW()
            WHERE id = $[id] AND deleted IS NULL
        `, { id });
    }

    async delete(id: string): Promise<PlatformConnection> {
        return this.db.one<PlatformConnection>(`
            UPDATE platform_connections SET deleted = NOW(), modified = NOW()
            WHERE id = $[id] AND deleted IS NULL
            RETURNING id, label, host, port, dbname, db_username,
                      lookback_days, is_active, automator_buyer_id, last_synced_at, created, modified, deleted
        `, { id });
    }
}
