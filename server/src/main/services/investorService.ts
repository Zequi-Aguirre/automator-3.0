import { injectable } from "tsyringe";
import InvestorDAO from "../data/investorDAO.ts";
import { Investor } from "../types/investorTypes.ts";

@injectable()
export default class InvestorService {
    constructor(private readonly investorDAO: InvestorDAO) {}

    async loadOrCreateInvestors(names: Set<string>): Promise<Map<string, Investor>> {
        const all = await this.investorDAO.getAllInvestors();
        const map = new Map<string, Investor>();

        for (const investor of all) {
            map.set(investor.name.toLowerCase(), investor);
        }

        for (const name of names) {
            const key = name.toLowerCase();
            if (!map.has(key)) {
                const created = await this.investorDAO.insertInvestor({ name });
                map.set(key, created);
            }
        }

        return map;
    }

    async getById(id: string): Promise<Investor | null> {
        return await this.investorDAO.getById(id);
    }

    async getManyByIds(ids: string[]): Promise<Investor[]> {
        return this.investorDAO.getManyByIds(ids);
    }

    async updateInvestorMeta(
        id: string,
        updates: Partial<Pick<Investor, "name" | "whitelisted" | "blacklisted">>
    ): Promise<Investor> {
        return await this.investorDAO.updateInvestor(id, updates);
    }
}