export type County = {
    id: string;
    name: string;
    state: string;
    population: number;
    timezone: string;
    blacklisted: boolean;
    whitelisted: boolean;
    zip_codes: string[] | null;
}