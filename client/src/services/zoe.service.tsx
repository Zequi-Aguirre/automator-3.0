// TICKET-128, TICKET-130, TICKET-131 — Zoe API service
import { authProvider, AxiosProvider } from '../config/axiosProvider';

export interface ZoeApiKey {
    id: string;
    name: string;
    active: boolean;
    last_used_at: string | null;
    created: string;
    revoked_at: string | null;
    created_by_name: string | null;
}

export interface ZoeApiKeyCreateResult {
    id: string;
    name: string;
    plaintext_key: string;
    created: string;
}

export interface ZoeConfig {
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
    updated_by_name: string | null;
}

class ZoeService {
    constructor(private readonly api: AxiosProvider) {}

    // ── API keys ──────────────────────────────────────────────────────────────

    async getKeys(): Promise<ZoeApiKey[]> {
        const res = await this.api.getApi().get('/api/zoe/keys');
        return res.data;
    }

    async createKey(name: string): Promise<ZoeApiKeyCreateResult> {
        const res = await this.api.getApi().post('/api/zoe/keys', { name });
        return res.data;
    }

    async revokeKey(id: string): Promise<ZoeApiKey> {
        const res = await this.api.getApi().delete(`/api/zoe/keys/${id}`);
        return res.data;
    }

    // ── Config ────────────────────────────────────────────────────────────────

    async getConfig(): Promise<ZoeConfig[]> {
        const res = await this.api.getApi().get('/api/zoe/config');
        return res.data;
    }

    async updateConfig(key: string, value: string): Promise<ZoeConfig> {
        const res = await this.api.getApi().patch(`/api/zoe/config/${key}`, { value });
        return res.data;
    }
}

const zoeService = new ZoeService(authProvider);
export default zoeService;
