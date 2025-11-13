import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { County } from "../types/countyTypes";

class CountyService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(): Promise<County[]> {
        const res = await this.api.getApi().get('/api/counties/admin/get-all');
        return res.data;
    }

    async updateCountyBlacklist(
        countyId: string,
        blacklisted: boolean
    ): Promise<County> {
        const res = await this.api.getApi().patch(`/api/counties/admin/blacklist/${countyId}`, { blacklisted });
        return res.data;
    }
}

const countyService = new CountyService(authProvider);
export default countyService;