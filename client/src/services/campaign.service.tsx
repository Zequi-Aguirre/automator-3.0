import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Campaign } from "../types/campaignTypes";

class CampaignService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(): Promise<Campaign[]> {
        const res = await this.api.getApi().get('/api/campaigns/admin/get-all');
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