import { injectable } from "tsyringe";
import { Campaign } from "../types/campaignTypes.ts";
import CampaignDAO from "../data/campaignDAO.ts";
import {Affiliate} from "../types/affiliateTypes.ts";

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

    async loadOrCreateCampaigns(
        campaignAffiliateMap: Map<string, string>, // campaignName -> affiliateName
        affiliateMap: Map<string, Affiliate>
    ): Promise<Map<string, Campaign>> {
        const all = await this.campaignDAO.getAllCampaigns();
        const map = new Map<string, Campaign>();

        for (const campaign of all) {
            map.set(campaign.name.toLowerCase(), campaign);
        }

        for (const [campaignName, affiliateName] of campaignAffiliateMap.entries()) {
            const key = campaignName.toLowerCase();
            if (!map.has(key)) {
                const affiliateKey = affiliateName?.toLowerCase();
                if (!affiliateKey) continue;
                const affiliate = affiliateMap.get(affiliateKey);
                if (!affiliate) continue;

                const created = await this.campaignDAO.insertCampaign({
                    name: campaignName,
                    affiliate_id: affiliate.id
                });

                map.set(key, created);
            }
        }

        return map;
    }

    async updateCampaignMeta(id: string, updates: Partial<Pick<Campaign, 'rating' | 'blacklisted'>>): Promise<Campaign> {
        return this.campaignDAO.updateCampaignMetadata(id, updates);
    }
}
