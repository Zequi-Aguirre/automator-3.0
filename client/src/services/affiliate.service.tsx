import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Affiliate } from "../types/affiliateTypes";

class AffiliateService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(): Promise<Affiliate[]> {
        const res = await this.api.getApi().get('/api/affiliates/admin/get-all');
        return res.data;
    }

    async updateAffiliateMeta(
        affiliateId: string,
        updates: { rating?: number; blacklisted?: boolean }
    ): Promise<Affiliate> {
        const res = await this.api.getApi().patch(`/api/affiliates/admin/update-meta/${affiliateId}`, updates);
        return res.data;
    }
}

const affiliateService = new AffiliateService(authProvider);
export default affiliateService;