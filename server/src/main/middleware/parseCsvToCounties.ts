import { parse } from "csv/sync";

export type ParsedCountyRow = {
    name: string;
    state: string;
    population: number | null;
    timezone: string | null;
    zip_codes: string[] | null; // TICKET-047: ZIP codes for county lookup
};

export function parseCsvToCounties(csv: string): ParsedCountyRow[] {
    if (!csv) return [];

    // Parse with real CSV parsing
    const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as Record<string, string>[];

    const rows: ParsedCountyRow[] = [];

    for (const raw of records) {
        // Normalize header variations
        const name = clean(raw.name || raw.Name);
        const state = clean(raw.state || raw.State);
        const populationStr = clean(raw.population || raw.Population);
        const timezone = clean(raw.timezone || raw.Timezone);
        const zipCodesStr = clean(raw.zip_codes || raw.Zip_Codes || raw['zip codes']);

        // Must have these two
        if (!name || !state) {
            continue;
        }

        // Convert population
        const population =
            populationStr && /^[0-9]+$/.test(populationStr)
                ? Number(populationStr)
                : null;

        // Parse ZIP codes (pipe-separated in CSV)
        const zip_codes = zipCodesStr
            ? zipCodesStr.split('|').map(z => z.trim()).filter(z => z.length > 0)
            : null;

        rows.push({
            name,
            state,
            population,
            timezone: timezone || null,
            zip_codes
        });
    }

    return rows;
}

// Helper to strip quotes + trim
function clean(val: any): string {
    if (!val) return "";
    return String(val).trim().replace(/^"+|"+$/g, "");
}