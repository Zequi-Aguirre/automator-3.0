import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { County, CountyFilterUpdateDTO } from "../types/countyTypes";

class CountyService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(): Promise<County[]> {
        const res = await this.api.getApi().get('/api/counties/get-all');
        return res.data;
    }

    async getById(id: string): Promise<County> {
        const res = await this.api.getApi().get(`/api/counties/${id}`);
        return res.data;
    }

    async getMany(filters: {
        page: number;
        limit: number;
        search: string;
        status: "all" | "active" | "blacklisted";
    }): Promise<{ counties: County[]; count: number }> {

        const res = await this.api.getApi().get(
            "/api/counties/get-many",
            { params: filters }
        );
        return res.data;
    }

    async updateBlacklist(id: string, value: boolean): Promise<County> {
        const res = await this.api.getApi().patch(
            `/api/counties/blacklist/${id}`,
            { blacklisted: value }
        );
        return res.data;
    }

    async update(id: string, updates: Partial<County>): Promise<County> {
        const res = await this.api.getApi().patch(
            `/api/counties/${id}`,
            updates
        );
        return res.data;
    }

    async updateBuyerFilter(id: string, dto: CountyFilterUpdateDTO): Promise<County> {
        const res = await this.api.getApi().patch(`/api/counties/${id}/buyer-filters`, dto);
        return res.data;
    }

    async import(formData: FormData): Promise<{
        imported: number;
        rejected: number;
        errors: string[];
    }> {
        const response = await this.api.getApi().post(
            "/api/counties/import",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" }
            }
        );

        return response.data;
    }
}

const countyService = new CountyService(authProvider);
export default countyService;