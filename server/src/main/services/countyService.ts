import { injectable } from "tsyringe";
import CountyDAO from "../data/countyDAO";
import { County } from "../types/countyTypes.ts";
import { parseCsvToCounties } from "../middleware/parseCsvToCounties.ts";
import { parsedLeadFromCSV } from "../types/leadTypes.ts";

/**
 * County with normalized name for fuzzy matching
 */
type CountyWithNormalized = County & { normalizedName: string };

/**
 * Calculates Levenshtein distance between two strings (case-insensitive)
 * Used for fuzzy matching county names
 */
function levenshteinDistance(a: string, b: string): number {
    a = a.toLowerCase();
    b = b.toLowerCase();

    const distanceMatrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        distanceMatrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        distanceMatrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const indicator = a[j - 1] === b[i - 1] ? 0 : 1;
            distanceMatrix[i][j] = Math.min(
                distanceMatrix[i - 1][j] + 1,
                distanceMatrix[i][j - 1] + 1,
                distanceMatrix[i - 1][j - 1] + indicator
            );
        }
    }

    return distanceMatrix[b.length][a.length];
}

/**
 * Normalizes county names for consistent matching
 * - Converts to lowercase
 * - Removes apostrophes
 * - Replaces "St." with "Saint"
 * - Removes " Parish" suffix (for Louisiana counties)
 */
function normalizeCountyName(name: string): string {
    return name.toLowerCase()
        .replace(/'/g, '')           // Remove apostrophes (e.g., "O'Brien" -> "obrien")
        .replace(/st\./g, 'saint')   // Standardize Saint (e.g., "St. Louis" -> "saint louis")
        .replace(/ parish\s*$/, ''); // Remove "Parish" suffix (e.g., "East Baton Rouge Parish" -> "east baton rouge")
}

/**
 * Finds the closest county based on Levenshtein distance
 * @param counties - Array of counties for a specific state
 * @param leadState - The state from the lead
 * @param normalizedLeadCounty - The normalized county name from the lead
 * @returns The matching county or undefined if no match found (< 55% similarity)
 */
function findClosestCounty(
    counties: CountyWithNormalized[],
    leadState: string,
    normalizedLeadCounty: string
): County | undefined {
    if (!leadState || !normalizedLeadCounty || !counties) {
        return undefined;
    }

    let closestCounty: County | undefined;
    let maxPercentage = 55; // Minimum 55% similarity required for match

    counties.forEach(county => {
        if (county.state.toLowerCase() === leadState.toLowerCase()) {
            const distance = levenshteinDistance(county.normalizedName, normalizedLeadCounty);
            const maxLength = Math.max(county.normalizedName.length, normalizedLeadCounty.length);
            const similarityPercentage = (1 - (distance / maxLength)) * 100;

            if (similarityPercentage > maxPercentage) {
                maxPercentage = similarityPercentage;
                closestCounty = county;
            }
        }
    });

    return closestCounty;
}

@injectable()
export default class CountyService {
    private countiesCache: Record<string, CountyWithNormalized[]> | null = null;

    constructor(private readonly countyDAO: CountyDAO) {}

    async getAll(): Promise<County[]> {
        return await this.countyDAO.getAllCounties();
    }

    /**
     * Get counties organized by state with normalized names (cached)
     * Used for efficient lead-to-county matching
     */
    async getCountiesByState(): Promise<Record<string, CountyWithNormalized[]>> {
        if (this.countiesCache) {
            return this.countiesCache;
        }

        const allCounties = await this.countyDAO.getAllCounties();
        const countiesByState: Record<string, CountyWithNormalized[]> = {};

        for (const county of allCounties) {
            const state = county.state.toUpperCase();
            if (!countiesByState[state]) {
                countiesByState[state] = [];
            }
            countiesByState[state].push({
                ...county,
                normalizedName: normalizeCountyName(county.name)
            });
        }

        this.countiesCache = countiesByState;
        return countiesByState;
    }

    /**
     * Match leads to existing counties using fuzzy matching
     * Does NOT auto-create counties - returns map of matched counties only
     * @param leads - Array of leads to match
     * @returns Map of matched counties (key: "countyname_state")
     */
    async matchLeadsToCounties(leads: parsedLeadFromCSV[]): Promise<Map<string, County>> {
        const countiesByState = await this.getCountiesByState();
        const countyMap = new Map<string, County>();

        for (const lead of leads) {
            const rawCounty = (lead.county ?? "").trim().replace(/^,/, "").trim();
            const rawState = (lead.state ?? "").trim();

            if (!rawCounty || !rawState) {
                continue;
            }

            // Normalize the lead's county name
            const normalizedLeadCounty = normalizeCountyName(rawCounty);

            // Get counties for this state
            const stateCounties = countiesByState[rawState.toUpperCase()];
            if (!stateCounties) {
                // State not found
                console.warn(`[CountyService] State not found: ${rawState}`);
                continue;
            }

            // Find closest matching county
            const matchedCounty = findClosestCounty(stateCounties, rawState, normalizedLeadCounty);

            if (matchedCounty) {
                const key = `${matchedCounty.name.toLowerCase()}_${matchedCounty.state.toLowerCase()}`;
                countyMap.set(key, matchedCounty);
                console.log(`[CountyService] Matched "${rawCounty}, ${rawState}" → "${matchedCounty.name}, ${matchedCounty.state}" (${matchedCounty.id})`);
            } else {
                // No match found (< 55% similarity)
                console.warn(`[CountyService] No match for county: "${rawCounty}, ${rawState}" (< 55% similarity)`);
            }
        }

        return countyMap;
    }

    /**
     * @deprecated Use matchLeadsToCounties() instead. This method auto-creates counties without metadata.
     */
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