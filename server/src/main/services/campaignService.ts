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

    async loadOrCreateCampaigns(names: Set<string>): Promise<Map<string, Campaign>> {
        const all = await this.campaignDAO.getAllCampaigns();
        const map = new Map<string, Campaign>();

        for (const campaign of all) {
            map.set(campaign.name.toLowerCase(), campaign);
        }

        for (const name of names) {
            const key = name.toLowerCase();
            if (!map.has(key)) {
                const created = await this.campaignDAO.insertCampaign({ name });
                map.set(key, created);
            }
        }

        return map;
    }

    async updateCampaignMeta(id: string, updates: Partial<Pick<Campaign, 'rating' | 'blacklisted'>>): Promise<Campaign> {
        return this.campaignDAO.updateCampaignMetadata(id, updates);
    }
}
