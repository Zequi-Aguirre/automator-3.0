import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Source, SourceCreateDTO, SourceUpdateDTO, CreateSourceResponse, RefreshTokenResponse } from "../types/sourceTypes";

/**
 * SourceService - Frontend API client for source management
 * TICKET-046: Handles CRUD operations and token management for lead sources
 */
class SourceService {
    constructor(private readonly api: AxiosProvider) {}

    /**
     * Get all sources with pagination and filters
     */
    async getAll(filters: {
        page: number;
        limit: number;
        search?: string;
        includeDeleted?: boolean;
    }): Promise<{ items: Source[]; count: number }> {
        const res = await this.api.getApi().get(
            "/api/sources",
            { params: filters }
        );
        return res.data;
    }

    /**
     * Get source by ID
     * Note: Token is masked in response
     */
    async getById(id: string): Promise<Source> {
        const res = await this.api.getApi().get(`/api/sources/${id}`);
        return res.data;
    }

    /**
     * Create new source
     * Returns source WITH token (one-time display)
     */
    async create(dto: SourceCreateDTO): Promise<CreateSourceResponse> {
        const res = await this.api.getApi().post("/api/sources", dto);
        return res.data;
    }

    /**
     * Update source (name, email only - not token)
     */
    async update(id: string, dto: SourceUpdateDTO): Promise<Source> {
        const res = await this.api.getApi().put(`/api/sources/${id}`, dto);
        return res.data;
    }

    /**
     * Refresh API token for source
     * Returns new token (one-time display)
     * WARNING: Old token becomes invalid immediately
     */
    async refreshToken(id: string): Promise<RefreshTokenResponse> {
        const res = await this.api.getApi().post(`/api/sources/${id}/refresh-token`);
        return res.data;
    }

    /**
     * Soft delete source
     */
    async delete(id: string): Promise<void> {
        await this.api.getApi().delete(`/api/sources/${id}`);
    }
}

export default new SourceService(authProvider);
