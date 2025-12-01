import { parse } from "csv/sync";

export type ParsedCountyRow = {
    name: string;
    state: string;
    population: number | null;
    timezone: string | null;
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

        // Must have these two
        if (!name || !state) {
            continue;
        }

        // Convert population
        const population =
            populationStr && /^[0-9]+$/.test(populationStr)
                ? Number(populationStr)
                : null;

        rows.push({
            name,
            state,
            population,
            timezone: timezone || null
        });
    }

    return rows;
}

// Helper to strip quotes + trim
function clean(val: any): string {
    if (!val) return "";
    return String(val).trim().replace(/^"+|"+$/g, "");
}