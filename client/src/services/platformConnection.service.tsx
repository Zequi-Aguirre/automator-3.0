// TICKET-140: Platform connection service
import { authProvider, AxiosProvider } from '../config/axiosProvider';
import { PlatformConnection, PlatformConnectionCreateDTO, PlatformConnectionUpdateDTO } from '../types/platformConnectionTypes';

class PlatformConnectionService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(): Promise<PlatformConnection[]> {
        const res = await this.api.getApi().get('/api/platform-connections');
        return res.data;
    }

    async create(dto: PlatformConnectionCreateDTO): Promise<PlatformConnection> {
        const res = await this.api.getApi().post('/api/platform-connections', dto);
        return res.data;
    }

    async update(id: string, dto: PlatformConnectionUpdateDTO): Promise<PlatformConnection> {
        const res = await this.api.getApi().patch(`/api/platform-connections/${id}`, dto);
        return res.data;
    }

    async delete(id: string): Promise<void> {
        await this.api.getApi().delete(`/api/platform-connections/${id}`);
    }

    async testConnection(id: string): Promise<{ ok: boolean; message: string }> {
        const res = await this.api.getApi().post(`/api/platform-connections/${id}/test`);
        return res.data;
    }
}

export default new PlatformConnectionService(authProvider);
