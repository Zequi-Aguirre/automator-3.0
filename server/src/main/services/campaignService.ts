import { injectable } from "tsyringe";
import { Campaign } from "../types/campaignTypes.ts";
import CampaignDAO from "../data/campaignDAO.ts";

@injectable()
export default class CampaignService {

    constructor(
        private readonly campaignDAO: CampaignDAO,
    ) {}

    async createOne(campaign: Partial<Campaign>): Promise<Campaign> {
        return this.campaignDAO.createOne(campaign);
    }

    async getAll(): Promise<Campaign[]> {
        return this.campaignDAO.getAll();
    }

    async getActive(): Promise<Campaign[]> {
        return this.campaignDAO.getActive();
    }

    async getById(campaignId: string): Promise<Campaign> {
        return this.campaignDAO.getById(campaignId);
    }

    async getByExternalId(externalId: string): Promise<Campaign> {
        return this.campaignDAO.getByExternalId(externalId);
    }

    async updateCampaign(campaignId: string, campaign: Partial<Campaign>): Promise<Campaign> {
        return this.campaignDAO.updateCampaign(campaignId, campaign);
    }

    async updateCampaignStatus(campaignId: string, status: boolean): Promise<Campaign> {
        return this.campaignDAO.updateCampaignStatus(campaignId, status);
    }

    async deleteCampaign(campaignId: string): Promise<void> {
        return this.campaignDAO.deleteCampaign(campaignId);
    }
}
