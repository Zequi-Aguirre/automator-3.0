import { parse } from 'csv/sync';
import { parsedLeadFromCSV } from "../controllers/validateLeads";

type ParsedCsvResult = {
    leads: parsedLeadFromCSV[];
    affiliates: Set<string>;
    campaigns: Map<string, string>; // <campaignName, affiliateName>
    investors: Set<string>;
};

function splitName(fullName: string): { first_name: string; last_name: string } {
    const parts = fullName?.trim().split(" ") || [];
    const first_name = parts.shift() || "";
    const last_name = parts.join(" ");
    return { first_name, last_name };
}

function extractCountyAndState(value: string): { county: string; state: string } {
    const [countyPart = "", statePart = ""] = value.split(",").map(v => v.trim());
    return { county: countyPart, state: statePart };
}

function cleanPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return digits;
    if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
    return "";
}

function parseDate(raw: string): Date | null {
    if (!raw) return null;

    // Match pattern: Oct/30/25 00:11
    const match = raw.trim().match(/^([A-Za-z]{3})\/(\d{1,2})\/(\d{2}) (\d{2}):(\d{2})$/);
    if (!match) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_line, monthStr, dayStr, yearStr, hourStr, minuteStr] = match;

    const months: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11
    };

    const month = months[monthStr];
    const day = parseInt(dayStr, 10);
    const year = 2000 + parseInt(yearStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (month === undefined || isNaN(day) || isNaN(year) || isNaN(hour) || isNaN(minute)) {
        return null;
    }

    // Convert to UTC with EST offset (UTC-5)
    const utcTimestamp = Date.UTC(year, month, day, hour + 5, minute); // Add 5 hours to convert from EST to UTC
    return new Date(utcTimestamp);
}

export function parseCsvToLeads(csvContent: string): ParsedCsvResult {
    const lines = csvContent.trim().split(/\r?\n/);

    // Handle the header row and patch the last column name
    const headerColumns = lines[0].split(",");
    if (headerColumns.length > 0) {
        headerColumns[headerColumns.length - 1] = "Imported"; // replace last empty with 'Imported'
        lines[0] = headerColumns.join(",");
    }

    // Parse CSV with corrected headers
    const records = parse(lines.join("\n"), {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as Record<string, string>[];

    const leads: parsedLeadFromCSV[] = [];
    const investors = new Set<string>();
    const affiliates = new Set<string>();
    const campaigns = new Map<string, string>(); // campaignName → affiliateName

    for (const row of records) {
        const {
            Seller,
            Phone,
            Email,
            Address,
            City,
            County,
            Zipcode,
            Dispute,
            Imported,
            Investor,
            Affiliate,
            Campaign
        } = row;

        const { county, state } = extractCountyAndState(County);
        const { first_name, last_name } = splitName(Seller);
        const phone = cleanPhone(Phone);
        const email = Email?.toLowerCase() || "";
        const imported_at = parseDate(Imported);
        if (Investor) investors.add(Investor.trim());
        if (Affiliate) affiliates.add(Affiliate.trim());
        if (Campaign) {
            campaigns.set(Campaign.trim(), Affiliate?.trim() || "");
        }

        if (!imported_at || !Address || !City || !state) continue;

        leads.push({
            name: `${first_name} ${last_name}`.trim(),
            first_name,
            last_name,
            phone,
            email,
            address: Address,
            city: City,
            state,
            zipcode: Zipcode,
            county,
            county_id: undefined,
            imported_at,
            dispute_status: Dispute,
            investor_id: Investor?.trim() || null,
            campaign_id: Campaign?.trim() || null,
        });
    }

    return { leads, investors, affiliates, campaigns };
}