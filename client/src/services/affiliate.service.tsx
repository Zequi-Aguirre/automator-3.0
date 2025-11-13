import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Affiliate } from "../types/affiliateTypes";

class AffiliateService {
    constructor(private readonly api: AxiosProvider) {}

    async getMany(params: { page: number; limit: number }): Promise<{ affiliates: Affiliate[]; count: number }> {
        const res = await this.api.getApi().get('/api/affiliates/admin/get-many', {
            params
        });
        return res.data;
    }

    async updateAffiliateMeta(
        affiliateId: string,
        updates: { rating?: number; blacklisted?: boolean }
    ): Promise<Affiliate> {
        const res = await this.api.getApi().patch(`/api/affiliates/admin/update-meta/${affiliateId}`, updates);
        return res.data;
    }

    async getById(affiliateId: string): Promise<Affiliate> {
        const res = await this.api.getApi().get(`/api/affiliates/admin/${affiliateId}`);
        return res.data;
    }
}

const affiliateService = new AffiliateService(authProvider);
export default affiliateService;