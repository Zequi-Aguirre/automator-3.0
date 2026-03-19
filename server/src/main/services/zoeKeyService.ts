// TICKET-130 — Zoe API key management service
import { injectable } from 'tsyringe';
import crypto from 'crypto';
import ZoeKeyDAO from '../data/zoeKeyDAO';
import ActivityService from './activityService';
import { ZoeApiKey, ZoeApiKeyCreateResult } from '../types/zoeTypes';
import { ZoeAction } from '../types/activityTypes';

@injectable()
export default class ZoeKeyService {
    constructor(
        private readonly zoeKeyDAO: ZoeKeyDAO,
        private readonly activityService: ActivityService,
    ) {}

    async getAll(): Promise<ZoeApiKey[]> {
        return this.zoeKeyDAO.getAll();
    }

    async create(name: string, createdBy: string | null): Promise<ZoeApiKeyCreateResult> {
        if (!name || name.trim().length === 0) throw new Error('Key name is required');

        // Generate 48-byte (96 hex char) random key
        const plaintextKey = `zoe_live_${crypto.randomBytes(48).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');

        const key = await this.zoeKeyDAO.create(name.trim(), keyHash, createdBy);

        await this.activityService.log({
            user_id: createdBy,
            action: ZoeAction.KEY_CREATED,
            action_details: { key_name: name },
        });

        return { id: key.id, name: key.name, plaintext_key: plaintextKey, created: key.created };
    }

    async revoke(id: string, revokedBy: string | null): Promise<ZoeApiKey> {
        const key = await this.zoeKeyDAO.revoke(id);

        await this.activityService.log({
            user_id: revokedBy,
            action: ZoeAction.KEY_REVOKED,
            action_details: { key_name: key.name },
        });

        return key;
    }

    async authenticate(bearerToken: string): Promise<ZoeApiKey | null> {
        const keyHash = crypto.createHash('sha256').update(bearerToken).digest('hex');
        const key = await this.zoeKeyDAO.getByHash(keyHash);
        if (key) {
            void this.zoeKeyDAO.touchLastUsed(key.id); // fire-and-forget
        }
        return key;
    }
}
