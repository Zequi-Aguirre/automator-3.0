import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Campaign, CampaignCreateDTO, CampaignUpdateDTO } from "../types/campaignTypes";
import { Affiliate } from "../types/affiliateTypes.ts";

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

    async getBySource(sourceId: string): Promise<{ campaigns: Campaign[] }> {
        const res = await this.api.getApi().get(`/api/campaigns/source/${sourceId}`);
        return res.data;
    }

    async create(dto: CampaignCreateDTO): Promise<Campaign> {
        const res = await this.api.getApi().post('/api/campaigns', dto);
        return res.data;
    }

    async update(id: string, dto: CampaignUpdateDTO): Promise<Campaign> {
        const res = await this.api.getApi().put(`/api/campaigns/${id}`, dto);
        return res.data;
    }

    async delete(id: string): Promise<void> {
        await this.api.getApi().delete(`/api/campaigns/${id}`);
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