import { singleton } from "tsyringe";
import CountyDAO from "./countyDAO";
import { County } from "../types/countyTypes";

/**
 * County with normalized name for fuzzy matching
 */
type CountyWithNormalized = County & { normalizedName: string };

/**
 * Normalizes county names for consistent matching
 * - Converts to lowercase
 * - Removes apostrophes
 * - Replaces "St." with "Saint"
 * - Removes " Parish" suffix (for Louisiana counties)
 */
export function normalizeCountyName(name: string): string {
    return name.toLowerCase()
        .replace(/'/g, '') // Remove apostrophes (e.g., "O'Brien" -> "obrien")
        .replace(/st\./g, 'saint') // Standardize Saint (e.g., "St. Louis" -> "saint louis")
        .replace(/ parish\s*$/, ''); // Remove "Parish" suffix (e.g., "East Baton Rouge Parish" -> "east baton rouge")
}

/**
 * Singleton that holds all counties cached in memory
 * Organized by state for efficient lookup
 */
export class CountiesSingleton {
    constructor(
        private readonly allCounties: County[],
        private readonly allCountiesByState: Record<string, CountyWithNormalized[]>,
        private readonly allStates: string[]
    ) {}

    /**
     * Get all counties
     */
    getCounties(): County[] {
        return this.allCounties;
    }

    /**
     * Get counties organized by state with normalized names
     * Key: uppercase state code (e.g., "FL", "CA", "TX")
     * Value: array of counties with normalizedName field
     */
    getAllCountiesOrderedByState(): Record<string, CountyWithNormalized[]> {
        return this.allCountiesByState;
    }

    /**
     * Get all counties for a specific state
     */
    getCountiesByStateName(state: string): CountyWithNormalized[] {
        return this.allCountiesByState[state.toUpperCase()] || [];
    }

    /**
     * Get all state codes
     */
    getAllStates(): string[] {
        return this.allStates;
    }

    /**
     * Get county by ID
     */
    getCountyById(countyId: string): County | null {
        return this.allCounties.find(county => county.id === countyId) ?? null;
    }
}

/**
 * Factory for creating and caching the CountiesSingleton
 * Registered as singleton in DI container to ensure only one instance exists
 */
@singleton()
export class CountiesSingletonFactory {
    private instance: CountiesSingleton | null = null;
    private initializationPromise: Promise<CountiesSingleton> | null = null;

    constructor(private readonly countyDAO: CountyDAO) {}

    /**
     * Get or create the singleton instance
     * Ensures counties are loaded once and cached in memory
     * Thread-safe: handles concurrent calls during initialization
     */
    public async singleton(): Promise<CountiesSingleton> {
        // Return cached instance if available
        if (this.instance) {
            return this.instance;
        }

        // If initialization is in progress, wait for it
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Start initialization
        this.initializationPromise = this.init();
        this.instance = await this.initializationPromise;
        return this.instance;
    }

    /**
     * Initialize the counties singleton by loading all counties from database
     * and organizing them by state for efficient lookups
     */
    private async init(): Promise<CountiesSingleton> {
        console.log('[CountiesSingleton] Loading counties from database...');

        // Load all counties from database
        const allCounties = await this.countyDAO.getAllCounties();

        console.log(`[CountiesSingleton] Loaded ${allCounties.length} counties`);

        // Sort by state, then by name
        allCounties.sort((a, b) => {
            if (a.state === b.state) {
                return a.name.localeCompare(b.name);
            }
            return a.state.localeCompare(b.state);
        });

        // Organize counties by state with normalized names
        const allCountiesByState = this.organizeCountiesByState(allCounties);

        // Extract unique states
        const statesSet = new Set<string>();
        for (const county of allCounties) {
            statesSet.add(county.state.toUpperCase());
        }
        const allStates = Array.from(statesSet).sort((a, b) => a.localeCompare(b));

        console.log(`[CountiesSingleton] Organized into ${allStates.length} states`);

        return new CountiesSingleton(allCounties, allCountiesByState, allStates);
    }

    /**
     * Group counties by state and add normalized names
     */
    private organizeCountiesByState(counties: County[]): Record<string, CountyWithNormalized[]> {
        const allCountiesByState: Record<string, CountyWithNormalized[]> = {};

        for (const county of counties) {
            const state = county.state.toUpperCase();
            if (!allCountiesByState[state]) {
                allCountiesByState[state] = [];
            }
            allCountiesByState[state].push({
                ...county,
                normalizedName: normalizeCountyName(county.name)
            });
        }

        return allCountiesByState;
    }

    /**
     * Get county by ID (convenience method)
     */
    public async getCountyById(countyId: string): Promise<County | null> {
        return (await this.singleton()).getCountyById(countyId);
    }
}
