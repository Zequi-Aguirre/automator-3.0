import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { County } from "../types/countyTypes";

class CountyService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(): Promise<County[]> {
        const res = await this.api.getApi().get('/api/counties/admin/get-all');
        return res.data;
    }

    async getMany(filters: { page: number; limit: number }):
        Promise<{ counties: County[]; count: number }> {
        const res = await this.api.getApi().get(
            "/api/counties/admin/get-many",
            { params: filters }
        );
        return res.data;
    }

    async updateBlacklist(id: string, value: boolean): Promise<County> {
        const res = await this.api.getApi().patch(`/api/counties/admin/blacklist/${id}`, {
            blacklisted: value
        });
        return res.data;
    }
}

const countyService = new CountyService(authProvider);
export default countyService;