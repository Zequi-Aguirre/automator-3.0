import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Campaign } from "../types/campaignTypes";

class CampaignService {
    constructor(private readonly api: AxiosProvider) {
    }

    async createOne(campaign: Partial<Campaign>): Promise<Campaign> {
        const response = await this.api.getApi().post('/api/campaigns/admin/create', campaign);
        return response.data;
    }

    // Get all leads
    async getAll(): Promise<Campaign[]> {
        const response = await this.api.getApi().get('/api/campaigns/admin/get-all');
        return response.data;
    }

    // get many with filters, limit and page
    async getActive(): Promise<Campaign[]> {
        const response = await this.api.getApi().get('/api/campaigns/admin/get-active');
        return response.data;
    }

    // Get campaign by ID
    async getById(campaignId: string): Promise<Campaign> {
        const response = await this.api.getApi().get(`/api/campaigns/admin/get/${campaignId}`);
        return response.data;
    }

    // Update campaign
    async updateCampaign(campaignId: string, campaign: Campaign): Promise<Campaign> {
        const response = await this.api.getApi().patch(`/api/campaigns/admin/update/${campaignId}`, campaign);
        return response.data;
    }

    // Update campaign status
    async updateCampaignStatus(campaignId: string, status: boolean): Promise<Campaign> {
        const response = await this.api.getApi().patch(`/api/campaigns/admin/update-status/${campaignId}`, {status});
        return response.data;
    }

    async deleteCampaign(campaignId: string): Promise<void> {
        await this.api.getApi().delete(`/api/campaigns/admin/delete/${campaignId}`);
    }

}

const leadsService = new CampaignService(authProvider);

export default leadsService;