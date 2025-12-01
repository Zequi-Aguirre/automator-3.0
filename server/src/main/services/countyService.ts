import { injectable } from "tsyringe";
import CountyDAO from "../data/countyDAO";
import { County } from "../types/countyTypes.ts";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";
import { parseCsvToCounties } from "../middleware/parseCsvToCounties.ts";

@injectable()
export default class CountyService {
    constructor(private readonly countyDAO: CountyDAO) {}

    async getAll(): Promise<County[]> {
        return await this.countyDAO.getAllCounties();
    }

    async loadOrCreateCounties(leads: parsedLeadFromCSV[]): Promise<Map<string, County>> {
        const existingCounties = await this.countyDAO.getAllCounties();
        const countyMap = new Map<string, County>();

        for (const county of existingCounties) {
            const key = `${county.name.toLowerCase()}_${county.state.toLowerCase()}`;
            countyMap.set(key, county);
        }

        for (const lead of leads) {
            const rawCounty = (lead.county ?? "").trim().replace(/^,/, "").trim();
            const rawState = (lead.state ?? "").trim();

            if (!rawCounty || !rawState) {
                continue;
            }

            const key = `${rawCounty.toLowerCase()}_${rawState.toLowerCase()}`;

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

    async importCounties(csvContent: string): Promise<{
        imported: number;
        rejected: number;
        errors: string[];
    }> {
        const rows = parseCsvToCounties(csvContent);
        const existing = await this.countyDAO.getAllCounties();

        const existingMap = new Map<string, County>();
        for (const c of existing) {
            const key = `${c.name.toLowerCase()}_${c.state.toLowerCase()}`;
            existingMap.set(key, c);
        }

        let imported = 0;
        let rejected = 0;
        const errors: string[] = [];

        console.log(rows[0]);
        for (const row of rows) {
            try {
                const name = row.name?.trim();
                const state = row.state?.trim();

                if (!name || !state) {
                    rejected++;
                    errors.push(`Missing name or state for row: ${JSON.stringify(row)}`);
                    continue;
                }

                const key = `${name.toLowerCase()}_${state.toLowerCase()}`;

                if (existingMap.has(key)) {
                    continue;
                }

                const created = await this.countyDAO.insertCounty({
                    name,
                    state,
                    population: row.population ? Number(row.population) : null,
                    timezone: row.timezone || null
                });

                existingMap.set(key, created);
                imported++;
            } catch (err) {
                rejected++;
                errors.push(err instanceof Error ? err.message : "Unknown error");
            }
        }

        return { imported, rejected, errors };
    }

    async updateCountyBlacklistStatus(id: string, blacklisted: boolean): Promise<County> {
        return await this.countyDAO.updateCountyBlacklistStatus(id, blacklisted);
    }

    async updateCountyMeta(
        id: string,
        updates: Partial<Pick<County, "name" | "state" | "population" | "timezone" | "blacklisted" | "whitelisted">>
    ): Promise<County> {
        return await this.countyDAO.updateCounty(id, updates);
    }

    async getManyByIds(ids: string[]): Promise<County[]> {
        return this.countyDAO.getManyByIds(ids);
    }

    async getMany(filters: {
        page: number;
        limit: number;
        search?: string;
        status?: "all" | "active" | "blacklisted";
    }): Promise<{ counties: County[]; count: number }> {
        return await this.countyDAO.getMany(filters);
    }

    async getById(id: string): Promise<County | null> {
        return await this.countyDAO.getById(id);
    }
}