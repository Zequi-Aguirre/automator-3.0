import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { LeadManager, LeadManagerCreateDTO, LeadManagerUpdateDTO } from "../types/leadManagerTypes";
import { Source } from "../types/sourceTypes";

class LeadManagerService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(filters: { page: number; limit: number; search?: string; includeInactive?: boolean }): Promise<{ items: LeadManager[]; count: number }> {
        const res = await this.api.getApi().get("/api/lead-managers", { params: filters });
        return res.data;
    }

    async getActive(): Promise<LeadManager[]> {
        const res = await this.api.getApi().get("/api/lead-managers/active");
        return res.data;
    }

    async getById(id: string): Promise<LeadManager> {
        const res = await this.api.getApi().get(`/api/lead-managers/${id}`);
        return res.data;
    }

    async create(dto: LeadManagerCreateDTO): Promise<LeadManager> {
        const res = await this.api.getApi().post("/api/lead-managers", dto);
        return res.data;
    }

    async update(id: string, dto: LeadManagerUpdateDTO): Promise<LeadManager> {
        const res = await this.api.getApi().put(`/api/lead-managers/${id}`, dto);
        return res.data;
    }

    async getSourcesByManager(id: string): Promise<(Source & { campaign_count: number })[]> {
        const res = await this.api.getApi().get(`/api/lead-managers/${id}/sources`);
        return res.data;
    }

    async delete(id: string): Promise<void> {
        await this.api.getApi().delete(`/api/lead-managers/${id}`);
    }
}

export default new LeadManagerService(authProvider);
