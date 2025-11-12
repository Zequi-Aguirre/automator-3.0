export type parsedLeadFromCSV = {
    name: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    county: string;
    county_id?: string;
    imported_at: Date;
    dispute_status?: string;
    affiliate?: string | null;
    campaign?: string | null;
};

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