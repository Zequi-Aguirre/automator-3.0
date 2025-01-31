import 'reflect-metadata'
import { singleton } from "tsyringe";
import LeadDAO from "./leadDAO.ts";
import { County } from "../types/countyType.ts";

@singleton()
export class CountiesSingletonFactory {
    private instance: CountiesSingleton | null = null;
    private initializationPromise: Promise<CountiesSingleton> | null = null;

    constructor(private readonly leadDAO: LeadDAO) {
    }

    public async singleton(): Promise<CountiesSingleton> {
        if (this.instance) {
            return this.instance;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.init();
        this.instance = await this.initializationPromise;
        return this.instance;
    }

    private async init(): Promise<CountiesSingleton> {
        console.log('init counties singleton')
        const allCounties = await this.leadDAO.getAllCounties();
        // sort by state and then by name
        allCounties.sort((a, b) => {
            if (a.state === b.state) {
                return a.name.localeCompare(b.name);
            }
            return a.state.localeCompare(b.state);
        });

        const allCountiesByState = this.organizeCountiesByState(allCounties);

        const statesSet = new Set<string>();
        for (const county of allCounties) {
            statesSet.add(county.state);
        }

        const allStates = Array.from(statesSet).sort((a, b) => a.localeCompare(b));

        return new CountiesSingleton(allCounties, allCountiesByState, allStates);
    }

    private organizeCountiesByState(counties: County[]): Record<string, (County & { normalizedName: string })[]> {
        const allCountiesByState: Record<string, (County & { normalizedName: string })[]> = {};
        for (const county of counties) {
            const state = county.state;
            if (!allCountiesByState[state]) {
                allCountiesByState[state] = [];
            }
            allCountiesByState[state].push({ ...county, normalizedName: this.normalizeCountyName(county.name) });
        }
        return allCountiesByState;
    }

    normalizeCountyName (name: string) {
        return name.toLowerCase().replace(/'/g, '').replace(/st\./g, 'saint').replace(/ parish\s*$/, '');
    }
}

export class CountiesSingleton {
    constructor(
        private readonly allCounties: County[],
        private readonly allCountiesByState: Record<string, (County & { normalizedName: string })[]>,
        private readonly allStates: string[]
    ) {}

    getCounties(): County[] {
        return this.allCounties;
    }

    getAllCountiesOrderedByState(): Record<string, (County & { normalizedName: string })[]> {
        return this.allCountiesByState;
    }

    getCountiesByStateName(state: string): County[] {
        return this.allCountiesByState[state]!
    }

    getAllStates(): string[] {
        return this.allStates;
    }
}