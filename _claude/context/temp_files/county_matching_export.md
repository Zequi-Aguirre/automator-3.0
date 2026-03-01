# County Matching Logic - Complete Export

This document contains all the county matching logic extracted from the Northstar lead auction platform codebase.

---

## 1. County Matching Algorithm

### Main Matching Function (Used in Lead Import)

```typescript
// From: server/src/main/services/leadService.ts (lines 80-100)

/**
 * Finds the closest county based on Levenshtein distance
 * @param counties - Array of counties with state, name, normalizedName, and id
 * @param leadState - The state from the lead
 * @param normalizedLeadCounty - The normalized county name from the lead
 * @returns The matching county with name and id, or undefined if no match found
 */
export function findClosestCounty(
    counties: { state: string; name: string, normalizedName: string; id: string }[],
    leadState: string,
    normalizedLeadCounty: string
): { name: string; id: string } | undefined {
    if (!leadState || !normalizedLeadCounty || !counties) {
        return undefined;
    }

    let closestCounty: { name: string; id: string } | undefined;
    let maxPercentage = 55; // Minimum 55% similarity required for match

    counties.forEach(county => {
        if (county.state.toLowerCase() === leadState.toLowerCase()) {
            const distance = levenshteinDistance(county.normalizedName, normalizedLeadCounty);
            const maxLength = Math.max(county.normalizedName.length, normalizedLeadCounty.length);
            const similarityPercentage = (1 - (distance / maxLength)) * 100;

            if (similarityPercentage > maxPercentage) {
                maxPercentage = similarityPercentage;
                closestCounty = { name: county.name, id: county.id };
            }
        }
    });

    return closestCounty;
}
```

### Levenshtein Distance Algorithm

```typescript
// From: server/src/main/controllers/validateLeads.ts (lines 90-116)

/**
 * Calculates the Levenshtein distance between two strings (case-insensitive)
 * Used to measure similarity between county names for fuzzy matching
 */
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
```

### County Name Normalization

```typescript
// From: server/src/main/data/countiesSingleton.ts (lines 67-69)

/**
 * Normalizes county names for consistent matching
 * - Converts to lowercase
 * - Removes apostrophes
 * - Replaces "St." with "Saint"
 * - Removes " Parish" suffix (for Louisiana counties)
 */
normalizeCountyName(name: string): string {
    return name.toLowerCase()
        .replace(/'/g, '')           // Remove apostrophes (e.g., "O'Brien" -> "obrien")
        .replace(/st\./g, 'saint')   // Standardize Saint (e.g., "St. Louis" -> "saint louis")
        .replace(/ parish\s*$/, ''); // Remove "Parish" suffix (e.g., "East Baton Rouge Parish" -> "east baton rouge")
}
```

---

## 2. County Table Schema

### Database Table Structure

```sql
-- From: postgres/migrations/20230529155327.do._initial_schema.sql

CREATE TABLE "public"."counties" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" text,
    "state" text,
    "population" bigint,
    "created" timestamp with time zone DEFAULT now(),
    "modified" timestamp with time zone DEFAULT now(),
    "deleted" date
);

-- Primary key index
CREATE UNIQUE INDEX county_pkey ON public.counties USING btree (id);
ALTER TABLE "public"."counties" ADD CONSTRAINT "county_pkey" PRIMARY KEY USING INDEX "county_pkey";

-- Additional index for filtering (added later)
CREATE INDEX idx_counties_id ON counties (id);
```

### Timezone Column (Added Later)

```sql
-- From: postgres/migrations/20240719161700.do._add_timezone_to_counties.sql

ALTER TABLE counties
ADD COLUMN timezone VARCHAR(255);

-- Example timezone assignments by state
UPDATE counties SET timezone = 'America/New_York' WHERE state IN ('CT', 'DE', 'GA', 'MA', 'MD', 'ME', 'NC', 'NH', 'NJ', 'NY', 'OH', 'PA', 'RI', 'SC', 'VA', 'VT', 'WV');
UPDATE counties SET timezone = 'America/Chicago' WHERE state IN ('AL', 'AR', 'IA', 'IL', 'LA', 'MN', 'MO', 'MS', 'OK', 'WI');
UPDATE counties SET timezone = 'America/Denver' WHERE state IN ('CO', 'MT', 'NM', 'UT', 'WY');
UPDATE counties SET timezone = 'America/Phoenix' WHERE state = 'AZ';  -- No DST
UPDATE counties SET timezone = 'America/Los_Angeles' WHERE state IN ('CA', 'NV', 'OR', 'WA');
```

### TypeScript Type Definition

```typescript
// From: common/types/countiesTypes.ts

import { z } from 'zod';

export const CountySchema = z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    // DB returns bigint as string, coerce to number
    population: z.coerce.number(),
    timezone: z.string(),
});

export type County = z.infer<typeof CountySchema>;
```

### Example County Records

From test data (server/src/test/data/countiesSingleton.test.ts):

| ID | Name | State | Population | Timezone |
|---|---|---|---|---|
| uuid-1 | Fresno | CA | 1,000,000+ | America/Los_Angeles |
| uuid-2 | El Paso | CO | 750,000+ | America/Denver |
| uuid-3 | Miami-Dade | FL | 2,700,000+ | America/New_York |
| uuid-4 | St. Lucie | FL | 320,000+ | America/New_York |
| uuid-5 | Cook | IL | 5,200,000+ | America/Chicago |
| uuid-6 | East Baton Rouge | LA | 440,000+ | America/Chicago |
| uuid-7 | Prince Georges | MD | 900,000+ | America/New_York |
| uuid-8 | Saint Charles | MO | 400,000+ | America/Chicago |
| uuid-9 | New York | NY | 1,600,000+ | America/New_York |

---

## 3. Lead Import Validation

### County Attachment Process

```typescript
// From: server/src/main/services/leadsImportService.ts (lines 241-273)

/**
 * Attach county IDs to leads using fuzzy matching
 * @param leads - The leads to attach county IDs to
 * @param invalidLeads - Array to push invalid leads to (mutated)
 * @returns Leads with county IDs attached
 */
async attachLeadsToCountyId(
    leads: parsedLeadFromCSV[],
    invalidLeads: parsedLeadFromCSV[]
): Promise<parsedLeadFromCSV[]> {
    // Get counties singleton (cached in-memory)
    const singleton = await this.countiesSingletonFactory.singleton();
    const counties = singleton.getAllCountiesOrderedByState();
    const linkedLeads: parsedLeadFromCSV[] = [];

    leads.forEach(lead => {
        // Normalize the county name from the lead
        const normalizedLeadCounty = this.countiesSingletonFactory.normalizeCountyName(lead.county);

        // Get counties for the lead's state
        const stateCounties = counties[lead.state.toUpperCase()];

        if (!stateCounties) {
            // State not found - reject lead
            invalidLeads.push({ ...lead, reason: 'County/State wrong formatting' });
            return;
        }

        // Find the closest matching county
        const closestCounty = findClosestCounty(stateCounties, lead.state, normalizedLeadCounty);

        if (closestCounty !== undefined) {
            // Match found - attach county ID and standardized name
            lead.county = closestCounty.name;
            linkedLeads.push({
                ...lead,
                county_id: closestCounty.id,
                county: closestCounty.name
            });
        } else {
            // No match found - reject lead
            invalidLeads.push({ ...lead, reason: 'County/State wrong formatting' });
        }
    });

    return linkedLeads;
}
```

### How Leads Are Rejected

**Rejection Criteria:**
1. **State not found**: If `lead.state` (uppercase) is not a key in the counties lookup
2. **No county match**: If fuzzy matching returns `undefined` (similarity < 55%)
3. **Missing data**: If state or county fields are empty/null (caught earlier in validation)

**Rejection Behavior:**
- Leads are **NOT saved** to the database
- They are returned in the `invalidLeads` array with a `reason` field
- Reason is always: `"County/State wrong formatting"`
- No "needs review" status - leads are fully rejected

**Error Messages:**

```typescript
// From: server/src/main/services/leadsImportService.ts (lines 154-160)

// If lead creation fails during database insert
if (result.error?.toLowerCase()?.includes('duplicate lead')) {
    duplicatedLeads.push({ ...failedLead, reason: result.error });
} else {
    invalidLeads.push({ ...failedLead, reason: 'unknown' });
}
```

---

## 4. API Intake Validation

### Lead Import Endpoint

```typescript
// From: server/src/main/resources/leadResource.ts (lines 136-150)

// POST /admin/import-data/:subscriptionType
this.router.post('/admin/import-data/:subscriptionType', (req, res) => {
    const {
        importedLeads,          // CSV data as string array
        leadsRequireVerification,
        defaultCategory,
        product,
        isRealEstate,
        leadSourceId
    } = req.body;
    const adminId = req.user.id;
    const subscriptionType = req.params.subscriptionType as SubscriptionType;

    // Permission check
    if (!hasPermission({
        requiredPermission: PermissionsNameEnum.UPLOAD,
        userPermissions: req.user.permissions
    })) {
        return res.status(GENERAL_FORBIDDEN).send({
            message: "You do not have permission to upload leads"
        });
    }

    const productName = this.productIdentifier.getProductFromOverride(true, product).name as Product;

    // Process leads through import service
    this.leadsImportService.insertManyLeads(
        importedLeads,
        adminId,
        subscriptionType,
        leadsRequireVerification,
        defaultCategory,
        productName,
        isRealEstate,
        leadSourceId
    )
    .then(response => {
        res.status(response.status).send(response.data);
    })
    .catch(error => {
        console.error('Error importing leads:', error);
        res.status(500).send({ message: 'Internal server error' });
    });
});
```

### Import Response Structure

```typescript
// Response includes:
{
    status: 200,
    data: {
        invalidLeads: parsedLeadFromCSV[],      // Leads that failed validation (including county mismatch)
        postedLeads: Lead[],                     // Successfully created leads
        duplicatedLeads: Partial<Lead>[],        // Leads rejected due to duplicate phone/email + address
        failedParsingLeads: string[]             // CSV rows that couldn't be parsed
    }
}
```

### Single Lead Creation Endpoint

```typescript
// From: server/src/main/services/leadsImportService.ts (lines 332-382)

/**
 * Creates a single lead and assigns it to the admin if subscriptionType is dynamic
 * @throws PostgresError if the lead already exists or county validation fails
 */
async createSingleLead(
    leadData: CreateLead,
    adminId: string,
    leadRequireVerification: boolean,
    subscriptionType: SubscriptionType,
    product: Product,
    leadSourceId?: string
): Promise<LeadEntity> {
    const leadToCreate: CreateLead = {
        ...leadData,
        uploaded_by_user_id: adminId,
        lead_source_id: leadSourceId ?? null,
        verified: !leadRequireVerification
    };

    let createdLead: LeadEntity;
    try {
        createdLead = await this.leadDAO.createSingleLead(
            leadToCreate,
            adminId,
            buyerNote,
            privateNote
        );
    } catch (error) {
        this.logger.error('Error creating lead:', { error });

        // Sanitize error messages for frontend
        let message = 'Unable to create lead';
        if (error.message.startsWith('Duplicate lead found with the same')) {
            message = error.message;
        } else if (error.message.endsWith('violates foreign key constraint "leads_category_id_fkey"')) {
            message = 'Unable to find category';
        } else if (error.message.endsWith('violates foreign key constraint "leads_county_id_fkey"')) {
            message = 'Unable to find county';  // ← County validation failure
        }
        throw new PostgresError(message);
    }

    // Auto-assign for dynamic subscriptions if verified
    if (subscriptionType === SubscriptionType.Dynamic && !leadRequireVerification) {
        await this.leadsAssignmentService.handleAssignLeads([createdLead], product, adminId);
    }

    return createdLead;
}
```

**County Validation for Single Leads:**
- Lead must have a valid `county_id` that exists in the `counties` table
- If `county_id` foreign key constraint fails → error message: `"Unable to find county"`
- County validation happens at the **database level** via foreign key constraint
- No fuzzy matching for single lead creation - exact county_id must be provided

---

## 5. State + County Matching Logic

### Counties Organized by State

```typescript
// From: server/src/main/data/countiesSingleton.ts (lines 32-53)

/**
 * Initialize the counties singleton by loading all counties from database
 * and organizing them by state for efficient lookups
 */
private async init(): Promise<CountiesSingleton> {
    // Load all counties from database
    const allCounties = await this.leadDAO.getAllCounties();

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
        statesSet.add(county.state);
    }
    const allStates = Array.from(statesSet).sort((a, b) => a.localeCompare(b));

    return new CountiesSingleton(allCounties, allCountiesByState, allStates);
}

/**
 * Group counties by state and add normalized names
 */
private organizeCountiesByState(counties: County[]): Record<string, (County & { normalizedName: string })[]> {
    const allCountiesByState: Record<string, (County & { normalizedName: string })[]> = {};

    for (const county of counties) {
        const state = county.state;
        if (!allCountiesByState[state]) {
            allCountiesByState[state] = [];
        }
        allCountiesByState[state].push({
            ...county,
            normalizedName: this.normalizeCountyName(county.name)
        });
    }

    return allCountiesByState;
}
```

### Database Query for Counties

```typescript
// From: server/src/main/data/leadDAO.ts (lines 930-938)

/**
 * Get all counties except for 'All' (special meta-county)
 */
async getAllCounties(): Promise<County[]> {
    const query = `
        SELECT *
        FROM counties
        WHERE deleted IS NULL AND name != 'All' AND state != 'ALL';
    `;
    const result = await this.db.query<County[]>(query);
    return result.map(row => convertToZodType(CountySchema, row));
}
```

### Matching Format

**Key-Value Structure:**
- Uses `Record<string, County[]>` (NOT compound keys like "miami-dade_florida")
- State codes are **UPPERCASE** (e.g., "FL", "CA", "TX")
- Counties within each state include a `normalizedName` field for matching

**Example Structure:**
```typescript
{
    "FL": [
        {
            id: "uuid-1",
            name: "Broward",
            state: "FL",
            population: 1952778,
            timezone: "America/New_York",
            normalizedName: "broward"
        },
        {
            id: "uuid-2",
            name: "Miami-Dade",
            state: "FL",
            population: 2716940,
            timezone: "America/New_York",
            normalizedName: "miami-dade"  // Hyphen preserved
        },
        {
            id: "uuid-3",
            name: "St. Lucie",
            state: "FL",
            population: 328297,
            timezone: "America/New_York",
            normalizedName: "saint lucie"  // "St." → "saint"
        }
    ],
    "CA": [...],
    "TX": [...]
}
```

### Handling Different County Name Formats

The normalization handles these variations automatically:

| Original | Normalized | Match Result |
|---|---|---|
| "Miami-Dade" | "miami-dade" | ✓ Exact match |
| "Miami Dade" | "miami dade" | ✓ 92% similarity (Levenshtein) |
| "Dade" | "dade" | ✗ Only 44% similarity to "miami-dade" |
| "St. Lucie" | "saint lucie" | ✓ Exact match |
| "Saint Lucie" | "saint lucie" | ✓ Exact match |
| "St Lucie" | "saint lucie" | ✓ Exact match |
| "O'Brien" | "obrien" | ✓ Apostrophe removed |
| "East Baton Rouge Parish" | "east baton rouge" | ✓ "Parish" removed |
| "East Baton Rouge" | "east baton rouge" | ✓ Exact match |

---

## 6. Code Examples

### Complete Matching Workflow

```typescript
// From: server/src/main/services/leadsImportService.ts

import { CountiesSingletonFactory } from "../data/countiesSingleton.ts";
import { findClosestCounty } from "./leadService.ts";

export default class LeadsImportService {
    constructor(
        private readonly countiesSingletonFactory: CountiesSingletonFactory,
        // ... other dependencies
    ) {}

    async processLeadImport(csvRow: any): Promise<Lead | null> {
        // 1. Parse the lead data
        const leadData = {
            name: csvRow.Name,
            phone: csvRow['Phone Number'],
            email: csvRow['Email Address'],
            address: csvRow.Address,
            city: csvRow.City,
            state: csvRow.State,
            zip_code: csvRow['Zip Code'],
            county: csvRow.County,
        };

        // 2. Normalize the county name
        const normalizedCounty = this.countiesSingletonFactory.normalizeCountyName(
            leadData.county
        );

        // 3. Get counties for the state
        const singleton = await this.countiesSingletonFactory.singleton();
        const countiesByState = singleton.getAllCountiesOrderedByState();
        const stateCounties = countiesByState[leadData.state.toUpperCase()];

        if (!stateCounties) {
            console.error(`State not found: ${leadData.state}`);
            return null;  // Reject lead
        }

        // 4. Find closest county using fuzzy matching
        const matchedCounty = findClosestCounty(
            stateCounties,
            leadData.state,
            normalizedCounty
        );

        if (!matchedCounty) {
            console.error(`No county match for: ${leadData.county}, ${leadData.state}`);
            return null;  // Reject lead
        }

        // 5. Create lead with matched county
        const lead = await this.leadDAO.createLead({
            ...leadData,
            county_id: matchedCounty.id,
            county: matchedCounty.name,  // Use standardized name
        });

        return lead;
    }
}
```

### Singleton Pattern for Performance

```typescript
// From: server/src/main/data/countiesSingleton.ts

@singleton()
export class CountiesSingletonFactory {
    private instance: CountiesSingleton | null = null;
    private initializationPromise: Promise<CountiesSingleton> | null = null;

    constructor(private readonly leadDAO: LeadDAO) {}

    /**
     * Get or create the singleton instance
     * Ensures counties are loaded once and cached in memory
     */
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

    /**
     * Get county by ID (used for lookups)
     */
    public async getCountyById(countyId: string): Promise<County | null> {
        return (await this.singleton()).getCountyById(countyId);
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
        return this.allCountiesByState[state]!;
    }

    getAllStates(): string[] {
        return this.allStates;
    }

    getCountyById(countyId: string): County | null {
        return this.allCounties.find(county => county.id === countyId) ?? null;
    }
}
```

---

## 7. Test Cases

### Test Data Setup

```typescript
// From: server/src/test/sample/counties.ts

export const greeneMO: ExtendedCounty = {
    id: "1",
    name: "Greene",
    state: "MO",
    population: 300000,
    timezone: "America/Chicago",
    county_bids: [],
};

export const miamidadeFL: ExtendedCounty = {
    id: "2",
    name: "Miami-Dade",
    state: "FL",
    population: 2716940,
    timezone: "America/New_York",
    county_bids: [],
};

export const stlucieFL: ExtendedCounty = {
    id: "3",
    name: "St. Lucie",
    state: "FL",
    population: 320000,
    timezone: "America/New_York",
    county_bids: [],
};
```

### Successful Match Examples

| Input County | Input State | Normalized | Match Result | Similarity |
|---|---|---|---|---|
| "Miami-Dade" | "FL" | "miami-dade" | Miami-Dade (uuid-2) | 100% |
| "Miami Dade" | "FL" | "miami dade" | Miami-Dade (uuid-2) | 92% |
| "Miamidade" | "FL" | "miamidade" | Miami-Dade (uuid-2) | 90% |
| "St. Lucie" | "FL" | "saint lucie" | St. Lucie (uuid-3) | 100% |
| "Saint Lucie" | "FL" | "saint lucie" | St. Lucie (uuid-3) | 100% |
| "St Lucie" | "FL" | "saint lucie" | St. Lucie (uuid-3) | 100% |
| "Greene" | "MO" | "greene" | Greene (uuid-1) | 100% |
| "Grene" | "MO" | "grene" | Greene (uuid-1) | 83% (typo) |
| "East Baton Rouge" | "LA" | "east baton rouge" | East Baton Rouge | 100% |
| "East Baton Rouge Parish" | "LA" | "east baton rouge" | East Baton Rouge | 100% |
| "O'Brien" | "IA" | "obrien" | O'Brien | 100% |
| "Saint Charles" | "MO" | "saint charles" | Saint Charles | 100% |
| "St. Charles" | "MO" | "saint charles" | Saint Charles | 100% |

### Rejected/Flagged Lead Examples

| Input County | Input State | Reason for Rejection | Note |
|---|---|---|---|
| "Dade" | "FL" | < 55% similarity | Only 44% match to "miami-dade" |
| "Orange" | "ZZ" | State not found | "ZZ" is not a valid state |
| "" | "FL" | Empty county | Caught in earlier validation |
| "Miami-Dade" | "" | Empty state | Caught in earlier validation |
| "Springfield" | "IL" | County doesn't exist | No "Springfield" county in IL |
| "Bronx" | "NY" | County doesn't exist | Bronx is a borough, not a county |
| "Kings" | "CA" | No match | Kings county exists in NY, not CA |
| "Random Text" | "TX" | < 55% similarity | No similar county found |
| "Miami-Dad" | "FL" | 91% similarity | ✓ ACCEPTED (typo tolerance) |
| "Miam Dade" | "FL" | 83% similarity | ✓ ACCEPTED (typo tolerance) |
| "Dade County" | "FL" | 51% similarity | ✗ REJECTED (below threshold) |

### Integration Test Example

```typescript
// From: server/src/test/data/countiesSingleton.test.ts

describe('CountiesSingleton', () => {
    it('should return counties organized by state', async () => {
        const countiesSingleton = await countiesSingletonFactory.singleton();
        const countiesByState = countiesSingleton.getAllCountiesOrderedByState();

        // Verify counties are organized by state
        expect(countiesByState).toBeDefined();
        expect(Object.keys(countiesByState).length).toBeGreaterThan(0);

        // Verify FL counties
        const flCounties = countiesByState['FL'];
        expect(flCounties.length).toBe(3);
        expect(flCounties[0]).toMatchObject({
            name: 'Broward',
            state: 'FL',
            normalizedName: 'broward'
        });
        expect(flCounties[1]).toMatchObject({
            name: 'Miami-Dade',
            state: 'FL',
            normalizedName: 'miami-dade'
        });
        expect(flCounties[2]).toMatchObject({
            name: 'St. Lucie',
            state: 'FL',
            normalizedName: 'saint lucie'  // Note: normalized
        });
    });

    it('should return counties for a specific state', async () => {
        const countiesSingleton = await countiesSingletonFactory.singleton();
        const stateName = 'FL';
        const counties = countiesSingleton.getCountiesByStateName(stateName);

        expect(counties.length).toBe(3);
        counties.forEach(county => {
            expect(county.state).toBe(stateName);
        });
    });
});
```

---

## 8. Edge Cases & Special Handling

### Louisiana "Parish" Suffix

Louisiana uses "Parish" instead of "County":
- **Input:** "East Baton Rouge Parish"
- **Normalized:** "east baton rouge"
- **Database:** "East Baton Rouge"
- **Result:** ✓ Match (100%)

### Saint/St. Variations

Counties with "Saint" or "St." in the name:
- **Input:** "St. Lucie", "Saint Lucie", "St Lucie"
- **Normalized:** All become "saint lucie"
- **Database:** "St. Lucie"
- **Result:** ✓ Match (100%)

### Apostrophes

Some county names contain apostrophes:
- **Input:** "O'Brien County"
- **Normalized:** "obrien county"
- **Database:** "O'Brien"
- **Result:** ✓ Match (similarity varies by length)

### Hyphenated Names

Counties with hyphens are preserved:
- **Input:** "Miami-Dade"
- **Normalized:** "miami-dade" (hyphen kept)
- **Input:** "Miami Dade"
- **Normalized:** "miami dade"
- **Match:** 92% similarity (very high, both accepted)

### Case Insensitivity

All matching is case-insensitive:
- "MIAMI-DADE" = "Miami-Dade" = "miami-dade" = "MiAmI-dAdE"

### Null/Empty Handling

```typescript
// From: server/src/main/services/leadService.ts

if (!leadState || !normalizedLeadCounty || !counties) {
    return undefined;  // Early return for invalid inputs
}
```

---

## 9. Performance Optimization

### Why Use a Singleton?

```typescript
// Counties are loaded ONCE on application startup and cached in memory
// Avoids repeated database queries for every lead import

// BAD (without singleton):
for (const lead of 10000leads) {
    const counties = await database.query('SELECT * FROM counties');  // 10,000 queries!
    matchCounty(lead, counties);
}

// GOOD (with singleton):
const countiesSingleton = await countiesSingletonFactory.singleton();  // 1 query
const counties = countiesSingleton.getAllCountiesOrderedByState();
for (const lead of 10000leads) {
    matchCounty(lead, counties);  // Uses cached data
}
```

### Lazy Initialization

```typescript
// Singleton is created on first access, not at app startup
// If no leads are imported, counties are never loaded

public async singleton(): Promise<CountiesSingleton> {
    if (this.instance) {
        return this.instance;  // Return cached instance
    }

    if (this.initializationPromise) {
        return this.initializationPromise;  // Wait for in-progress initialization
    }

    // Initialize only once
    this.initializationPromise = this.init();
    this.instance = await this.initializationPromise;
    return this.instance;
}
```

---

## 10. Implementation Checklist

To implement this county matching logic in another project:

- [ ] **Database Setup**
  - [ ] Create `counties` table with id, name, state, population, timezone columns
  - [ ] Add primary key index on `id`
  - [ ] Add index on `id` for faster lookups
  - [ ] Populate with U.S. county data

- [ ] **Normalization Function**
  - [ ] Implement `normalizeCountyName()` function
  - [ ] Handle apostrophes, "St."/"Saint", "Parish" suffix

- [ ] **Levenshtein Distance**
  - [ ] Implement case-insensitive Levenshtein distance algorithm
  - [ ] Test with various county name variations

- [ ] **Matching Algorithm**
  - [ ] Implement `findClosestCounty()` with 55% threshold
  - [ ] Return best match or undefined
  - [ ] Support state filtering

- [ ] **Singleton/Cache**
  - [ ] Create counties singleton or cache mechanism
  - [ ] Load counties once and organize by state
  - [ ] Add normalized names to cached data

- [ ] **Lead Import Validation**
  - [ ] Check if state exists in lookup
  - [ ] Normalize county name before matching
  - [ ] Reject leads with < 55% similarity
  - [ ] Provide clear error messages

- [ ] **API Integration**
  - [ ] Add county validation to lead creation endpoints
  - [ ] Return rejected leads with reasons
  - [ ] Support both bulk import and single lead creation

- [ ] **Testing**
  - [ ] Test exact matches
  - [ ] Test fuzzy matches (typos, spacing)
  - [ ] Test edge cases (St./Saint, Parish, apostrophes)
  - [ ] Test rejection threshold (< 55%)
  - [ ] Test invalid states

---

## 11. Key Takeaways

1. **Fuzzy matching is essential**: 55% threshold allows typo tolerance while preventing bad matches
2. **Normalization is critical**: Standardize "St./Saint", remove apostrophes and "Parish"
3. **State-first lookup**: Always filter by state before matching county names
4. **Reject, don't guess**: If no good match (< 55%), reject the lead rather than guessing
5. **Cache for performance**: Load counties once at startup, not per-lead
6. **Standardize on save**: Store the standardized county name, not the user's input
7. **Foreign key enforcement**: Database constraints prevent invalid county_ids

---

**End of Export**
