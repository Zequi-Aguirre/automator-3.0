import { parse } from 'csv/sync';
import { parsedLeadFromCSV } from "../types/leadTypes.ts";

type ParsedCsvResult = {
    leads: parsedLeadFromCSV[];
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

export function parseCsvToLeads(csvContent: string): ParsedCsvResult {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    }) as Record<string, string>[];

    const leads: parsedLeadFromCSV[] = [];

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
            'Private Notes': PrivateNotes,
        } = row;

        const { first_name, last_name } = splitName(Name);
        const phone = cleanPhone(PhoneNumber || "");
        const email = EmailAddress?.toLowerCase() || "";

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
            state: State.toUpperCase(),
            zipcode: ZipCode || "",
            county: County || "",
            county_id: undefined,
            private_notes: PrivateNotes || null,
        });
    }

    return { leads };
}
