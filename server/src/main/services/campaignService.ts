import { injectable } from "tsyringe";
import { Campaign } from "../types/campaignTypes.ts";
import CampaignDAO from "../data/campaignDAO.ts";
import { Affiliate } from "../types/affiliateTypes.ts";
import AffiliateService from "./affiliateService.ts";

@injectable()
export default class CampaignService {

    constructor(
        private readonly campaignDAO: CampaignDAO,
        private readonly affiliateService: AffiliateService
    ) {}

    async getMany(filters: { page: number; limit: number }): Promise<{
        campaigns: Campaign[];
        count: number;
        affiliates: Affiliate[];
    }> {
        const { campaigns, count } = await this.campaignDAO.getMany(filters);

        let affiliates: Affiliate[] = [];

        if (campaigns.length > 0) {
            const affiliateIds = campaigns.map(c => c.affiliate_id);

            if (affiliateIds.length > 0) {
                affiliates = await this.affiliateService.getManyByIds(affiliateIds);
            }
        }

        return {
            campaigns,
            count,
            affiliates
        };
    }

    async getByAffiliateId(affiliateId: string): Promise<{ campaigns: Campaign[] }> {
        const campaigns = await this.campaignDAO.getByAffiliateId(affiliateId);
        return { campaigns };
    }

    async getById(id: string): Promise<Campaign | null> {
        return this.campaignDAO.getById(id);
    }

    async getManyByIds(ids: string[]): Promise<Campaign[]> {
        return this.campaignDAO.getManyByIds(ids);
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
