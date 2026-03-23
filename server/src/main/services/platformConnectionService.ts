import { injectable } from 'tsyringe';
import { Client } from 'pg';
import crypto from 'crypto';
import PlatformConnectionDAO from '../data/platformConnectionDAO';
import { EnvConfig } from '../config/envConfig';
import {
    PlatformConnection,
    PlatformConnectionCreateDTO,
    PlatformConnectionUpdateDTO,
} from '../types/platformConnectionTypes';

// AES-256-GCM. Stored format: ivHex:tagHex:ciphertextHex
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 16;

function deriveKey(secret: string): Buffer {
    // SHA-256 so any length secret becomes a 32-byte key
    return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext: string, secret: string): string {
    const key = deriveKey(secret);
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

function decrypt(stored: string, secret: string): string {
    const [ivHex, tagHex, ctHex] = stored.split(':');
    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
        decipher.update(Buffer.from(ctHex, 'hex')),
        decipher.final(),
    ]).toString('utf8');
}

@injectable()
export default class PlatformConnectionService {
    constructor(
        private readonly dao: PlatformConnectionDAO,
        private readonly config: EnvConfig,
    ) {}

    private encryptPassword(password: string): string {
        return encrypt(password, this.config.platformSyncEncryptionKey);
    }

    private decryptPassword(stored: string): string {
        return decrypt(stored, this.config.platformSyncEncryptionKey);
    }

    async getAll(): Promise<PlatformConnection[]> {
        return this.dao.getAll();
    }

    async getById(id: string): Promise<PlatformConnection | null> {
        return this.dao.getById(id);
    }

    async create(dto: PlatformConnectionCreateDTO): Promise<PlatformConnection> {
        const encryptedPassword = this.encryptPassword(dto.password);
        return this.dao.create(dto, encryptedPassword);
    }

    async update(id: string, dto: PlatformConnectionUpdateDTO): Promise<PlatformConnection> {
        let encryptedPassword: string | undefined;
        if (dto.password) {
            encryptedPassword = this.encryptPassword(dto.password);
        }
        return this.dao.update(id, dto, encryptedPassword);
    }

    async delete(id: string): Promise<PlatformConnection> {
        return this.dao.delete(id);
    }

    async testConnection(id: string): Promise<{ ok: boolean; message: string }> {
        const row = await this.dao.getByIdWithPassword(id);
        if (!row) return { ok: false, message: 'Connection not found' };

        const password = this.decryptPassword(row.encrypted_password);

        const client = new Client({
            host: row.host,
            port: row.port,
            database: row.dbname,
            user: row.db_username,
            password,
            connectionTimeoutMillis: 8000,
            ssl: { rejectUnauthorized: false },
        });

        try {
            await client.connect();
            await client.query('SELECT 1');
            return { ok: true, message: 'Connection successful' };
        } catch (err) {
            return { ok: false, message: err instanceof Error ? err.message : 'Unknown error' };
        } finally {
            await client.end().catch(() => {});
        }
    }

    // Used by PlatformSyncJob — returns active connections with decrypted passwords
    async getActiveConnectionsWithPasswords(): Promise<(PlatformConnection & { password: string })[]> {
        const rows = await this.dao.getActiveConnections();
        return rows.map(row => ({
            ...row,
            password: this.decryptPassword(row.encrypted_password),
        }));
    }

    async updateLastSynced(id: string): Promise<void> {
        return this.dao.updateLastSynced(id);
    }
}
