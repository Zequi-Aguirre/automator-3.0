import { parse } from 'csv/sync';
import { parsedLeadFromCSV } from "../types/leadTypes.ts";

type ParsedCsvResult = {
    leads: parsedLeadFromCSV[];
    investors: Set<string>;
};

// US State name to abbreviation mapping
const STATE_MAP: Record<string, string> = {
    // Full state names
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY',
    // Abbreviations (already correct)
    'AL': 'AL', 'AK': 'AK', 'AZ': 'AZ', 'AR': 'AR', 'CA': 'CA', 'CO': 'CO',
    'CT': 'CT', 'DE': 'DE', 'FL': 'FL', 'GA': 'GA', 'HI': 'HI', 'ID': 'ID',
    'IL': 'IL', 'IN': 'IN', 'IA': 'IA', 'KS': 'KS', 'KY': 'KY', 'LA': 'LA',
    'ME': 'ME', 'MD': 'MD', 'MA': 'MA', 'MI': 'MI', 'MN': 'MN', 'MS': 'MS',
    'MO': 'MO', 'MT': 'MT', 'NE': 'NE', 'NV': 'NV', 'NH': 'NH', 'NJ': 'NJ',
    'NM': 'NM', 'NY': 'NY', 'NC': 'NC', 'ND': 'ND', 'OH': 'OH', 'OK': 'OK',
    'OR': 'OR', 'PA': 'PA', 'RI': 'RI', 'SC': 'SC', 'SD': 'SD', 'TN': 'TN',
    'TX': 'TX', 'UT': 'UT', 'VT': 'VT', 'VA': 'VA', 'WA': 'WA', 'WV': 'WV',
    'WI': 'WI', 'WY': 'WY',
};

export function splitName(fullName: string): { first_name: string; last_name: string } {
    const parts = fullName?.trim().split(" ") || [];
    const first_name = parts.shift() || "";
    const last_name = parts.join(" ");
    return { first_name, last_name };
}

export function cleanPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
    return "";
}

export function cleanState(state: string): string {
    if (!state) return "";

    // Trim whitespace and remove trailing periods
    const cleaned = state.trim().replace(/\.+$/, "");

    // Try to map full state name or abbreviation to standard abbreviation
    const mapped = STATE_MAP[cleaned.toLowerCase()];
    if (mapped) return mapped;

    // If no mapping found, return cleaned uppercase version
    // (will fail validation if invalid, which is correct behavior)
    return cleaned.toUpperCase();
}

export function parseCsvToLeads(csvContent: string): ParsedCsvResult {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as Record<string, string>[];

    const leads: parsedLeadFromCSV[] = [];
    const investors = new Set<string>();

    for (const row of records) {
        const {
            Name,
            'Phone Number': PhoneNumber,
            'Email Address': EmailAddress,
            Address,
            City,
            State,
            'Zip Code': ZipCode,
            County,
            Investor
        } = row;

        const { first_name, last_name } = splitName(Name);
        const phone = cleanPhone(PhoneNumber || "");
        const email = EmailAddress?.toLowerCase() || "";

        if (Investor) investors.add(Investor.trim());

        // Validation: require Address, City, State
        if (!Address || !City || !State) continue;

        leads.push({
            name: `${first_name} ${last_name}`.trim(),
            first_name,
            last_name,
            phone,
            email,
            address: Address,
            city: City,
            state: cleanState(State),
            zipcode: ZipCode || "",
            county: County || "",
            county_id: undefined,
            investor_id: Investor?.trim() || null,
        });
    }

    return { leads, investors };
}
