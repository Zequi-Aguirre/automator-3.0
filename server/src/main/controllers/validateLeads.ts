export type parsedLeadFromCSV = {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    county: string;
    private_note: string;
    uploaded_by_user_id?: string;
    reason?: string;
};

const isLeadEmpty = (lead: parsedLeadFromCSV): boolean => {
    if (lead.name.trim() !== "") return false;
    if (lead.phone.trim() !== "") return false;
    if (lead.email.trim() !== "") return false;
    if (lead.address.trim() !== "") return false;
    if (lead.city.trim() !== "") return false;
    if (lead.state.trim() !== "") return false;
    if (lead.zip_code.trim() !== "") return false;
    if (lead.county.trim() !== "") return false;
    if (lead.private_note.trim() !== "") return false;
    return true;
};

export function validateLeads(leads: parsedLeadFromCSV[]) {
    const validLeads: parsedLeadFromCSV[] = [];
    const invalidLeads: parsedLeadFromCSV[] = [];

    // Function to check if a lead is valid
    function isValidLead(lead: parsedLeadFromCSV) {
        // Validation rules: Example rules (modify as needed)
        const isValidName = lead.name.trim() !== '';
        const isValidPhone = lead.phone.trim() !== '';
        const isValidEmail = lead.email.trim() !== '' && lead.email.includes('@');
        const isValidAddress = lead.address.trim() !== '';
        const hasZipCode = lead.zip_code.trim() !== '';

        // Add more validation rules as required

        // attach reasons for invalid leads
        if (!isValidName) {
            lead.reason = 'Invalid name';
        }
        if (!isValidPhone) {
            lead.reason = lead.reason ? lead.reason + ', phone ' : 'Invalid phone';
        }
        if (!isValidEmail) {
            lead.reason = lead.reason ? lead.reason + ', email ' : 'Invalid email';
        }
        if (!isValidAddress) {
            lead.reason = lead.reason ? lead.reason + ', address ' : 'Invalid address';
        }
        if (!hasZipCode) {
            lead.reason = lead.reason ? lead.reason + ', zip_code ' : 'Invalid zip_code';
        }

        return isValidName && isValidPhone && isValidEmail && isValidAddress && hasZipCode; // Add more conditions based on your validation criteria
    }

    // Iterate through each lead
    leads.forEach(lead => {
        // Check if lead is empty
        if (isLeadEmpty(lead)) {
            return;
        }
        if (isValidLead(lead)) {
            validLeads.push(lead);
        } else {
            invalidLeads.push(lead);
        }
    });

    return {
        validLeads,
        invalidLeads
    };
}

export function levenshteinDistance(a: string, b: string): number {
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