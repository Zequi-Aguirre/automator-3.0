import { injectable } from "tsyringe";
import AffiliateDAO from "../data/affiliateDAO.ts";
import { Affiliate } from "../types/affiliateTypes.ts";

@injectable()
export default class AffiliateService {
    constructor(private readonly affiliateDAO: AffiliateDAO) {}

    async loadOrCreateAffiliates(names: Set<string>): Promise<Map<string, Affiliate>> {
        const all = await this.affiliateDAO.getAllAffiliates();
        const map = new Map<string, Affiliate>();

        for (const affiliate of all) {
            map.set(affiliate.name.toLowerCase(), affiliate);
        }

        for (const name of names) {
            const key = name.toLowerCase();
            if (!map.has(key)) {
                const created = await this.affiliateDAO.insertAffiliate({ name });
                map.set(key, created);
            }
        }

        return map;
    }

    async updateAffiliateMeta(id: string, updates: Partial<Pick<Affiliate, 'rating' | 'blacklisted'>>): Promise<Affiliate> {
        return this.affiliateDAO.updateAffiliate(id, updates);
    }

    async getAll(): Promise<Affiliate[]> {
        return await this.affiliateDAO.getAllAffiliates();
    }
}