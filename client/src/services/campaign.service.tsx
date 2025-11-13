import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Campaign } from "../types/campaignTypes";
import {Affiliate} from "../../../server/src/main/types/affiliateTypes.ts";

class CampaignService {
    constructor(private readonly api: AxiosProvider) {}
    async getMany(filters: {
        page: number,
        limit: number
    }): Promise<{ campaigns: Campaign[]; count: number; affiliates: Affiliate[] }> {
        const response = await this.api.getApi().get(
            '/api/campaigns/admin/get-many',
            { params: filters }
        );
        return response.data;
    }

    async getByAffiliateId(affiliateId: string): Promise<{ campaigns: Campaign[] }> {
        const res = await this.api.getApi().get(`/api/campaigns/admin/get-by-affiliate/${affiliateId}`);
        return res.data;
    }

    async updateCampaignMeta(
        campaignId: string,
        updates: { rating?: number; blacklisted?: boolean }
    ): Promise<Campaign> {
        const res = await this.api.getApi().patch(`/api/campaigns/admin/update-meta/${campaignId}`, updates);
        return res.data;
    }
}

const campaignService = new CampaignService(authProvider);
export default campaignService;