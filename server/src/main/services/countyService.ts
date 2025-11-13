import { injectable } from "tsyringe";
import CountyDAO from "../data/countyDAO";
import { County } from "../types/countyTypes.ts";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";

@injectable()
export default class CountyService {
    constructor(private readonly countyDAO: CountyDAO) {}

    async getAll(): Promise<County[]> {
        return await this.countyDAO.getAllCounties();
    }

    async loadOrCreateCounties(leads: parsedLeadFromCSV[]): Promise<Map<string, County>> {
        const existingCounties = await this.countyDAO.getAllCounties();
        const countyMap = new Map<string, County>();

        // Build map from existing records
        for (const county of existingCounties) {
            const key = `${county.name.toLowerCase()}_${county.state.toLowerCase()}`;
            countyMap.set(key, county);
        }

        for (const lead of leads) {
            // Clean incoming values
            const rawCounty = (lead.county ?? "").trim().replace(/^,/, "").trim();
            const rawState = (lead.state ?? "").trim();

            // Skip if either is missing or empty after cleanup
            if (!rawCounty || !rawState) {
                continue;
            }

            const key = `${rawCounty.toLowerCase()}_${rawState.toLowerCase()}`;

            // Insert only if not already in map
            if (!countyMap.has(key)) {
                const newCounty = await this.countyDAO.insertCounty({
                    name: rawCounty,
                    state: rawState,
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

    async getMany(filters: { page: number; limit: number }): Promise<{ counties: County[]; count: number }> {
        return await this.countyDAO.getMany(filters);
    }
}