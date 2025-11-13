import { injectable } from "tsyringe";
import CountyDAO from "../data/countyDAO";
import { County } from "../types/countyType";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";

@injectable()
export default class CountyService {
    constructor(private readonly countyDAO: CountyDAO) {}

    async getAll(): Promise<County[]> {
        return await this.countyDAO.getAllCounties();
    }

    async create(data: County): Promise<County> {
        return await this.countyDAO.insertCounty(data);
    }

    async findByNameAndState(name: string, state: string): Promise<County | null> {
        const all = await this.countyDAO.getAllCounties();
        return all.find(
            c => c.name.toLowerCase() === name.toLowerCase() && c.state.toLowerCase() === state.toLowerCase()
        ) || null;
    }

    async loadOrCreateCounties(leads: parsedLeadFromCSV[]): Promise<Map<string, County>> {
        const existingCounties = await this.countyDAO.getAllCounties();
        const countyMap = new Map<string, County>();

        for (const county of existingCounties) {
            const key = `${county.name.toLowerCase()}_${county.state.toLowerCase()}`;
            countyMap.set(key, county);
        }

        for (const lead of leads) {
            const key = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            if (!countyMap.has(key)) {
                const newCounty = await this.countyDAO.insertCounty({
                    name: lead.county,
                    state: lead.state,
                    population: null,
                    timezone: null
                });
                countyMap.set(key, newCounty);
            }
        }

        return countyMap;
    }

    async updateCountyBlacklistStatus(id: string, blacklisted: boolean): Promise<County> {
        return this.countyDAO.updateCountyBlacklistStatus(id, blacklisted);
    }
}