import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { Lead, LeadUpdateAllowedFieldsType } from "../types/leadTypes";
import { IClient } from "pg-promise/typescript/pg-subset";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";

@injectable()
export default class LeadDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async updateLead(
        id: string,
        updates: Partial<LeadUpdateAllowedFieldsType>
    ): Promise<Lead> {
        if (!id) {
            throw new Error("Lead ID is required");
        }

        // Get the complete updated fields using the helper function
        const updatedFields = await this.getUpdatedLeadFields(id, updates);

        const query = `
            UPDATE leads
            SET 
                address = $[address],
                city = $[city],
                state = $[state],
                zipcode = $[zipcode],
                first_name = $[first_name],
                last_name = $[last_name],
                phone = $[phone],
                email = $[email],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        // Include all fields and id in the query parameters
        const params = { ...updatedFields, id };

        // Execute the query
        const result = await this.db.oneOrNone<Lead>(query, params);
        if (!result) {
            throw new Error("Lead not found or update failed");
        }

        return result;
    }

    // Mark lead as verified
    async verifyLead(leadId: string): Promise<Lead> {
        const query = `
        UPDATE leads
        SET verified = TRUE,
            modified = NOW()
        WHERE id = $[leadId]
        AND deleted IS NULL
        RETURNING *;
    `;
        const result = await this.db.oneOrNone<Lead>(query, { leadId });
        if (!result) {
            throw new Error("Lead not found or verify failed");
        }
        return result;
    }

// Mark lead as unverified
    async unverifyLead(leadId: string): Promise<Lead> {
        const query = `
        UPDATE leads
        SET verified = FALSE,
            modified = NOW()
        WHERE id = $[leadId]
        AND deleted IS NULL
        RETURNING *;
    `;
        const result = await this.db.oneOrNone<Lead>(query, { leadId });
        if (!result) {
            throw new Error("Lead not found or unverify failed");
        }
        return result;
    }

    private async getUpdatedLeadFields(
        id: string,
        updates: Partial<LeadUpdateAllowedFieldsType>
    ): Promise<LeadUpdateAllowedFieldsType> {
        // Fetch the existing Lead from the database
        const existingLead = await this.getById(id);
        if (!existingLead) {
            throw new Error("Lead not found");
        }

        // Combine the updates with the existing lead data
        return {
            address: updates.address ?? existingLead.address,
            city: updates.city ?? existingLead.city,
            state: updates.state ?? existingLead.state,
            zipcode: updates.zipcode ?? existingLead.zipcode,
            first_name: updates.first_name ?? existingLead.first_name,
            last_name: updates.last_name ?? existingLead.last_name,
            phone: updates.phone ?? existingLead.phone,
            email: updates.email ?? existingLead.email,
        };
    }

    // Get lead by ID
    async getById(id: string): Promise<Lead | null> {
        const query = `
            SELECT *
            FROM leads
            WHERE id = $[id]
            AND deleted IS NULL;
        `;

        return await this.db.oneOrNone<Lead>(query, { id });
    }

    async getMany(filters: { page: number; limit: number }): Promise<{ leads: Lead[]; count: number }> {
        const { page, limit } = filters;
        const offset = (page - 1) * limit;

        // Query #1: Get paginated leads
        const leadsQuery = `
            SELECT *
            FROM leads
            WHERE deleted IS NULL
            ORDER BY modified DESC
            LIMIT $1 OFFSET $2
        `;
        const leads = await this.db.manyOrNone<Lead>(leadsQuery, [limit, offset]);

        // Query #2: Get total count (ignores pagination)
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM leads
            WHERE deleted IS NULL
        `;
        const { total } = await this.db.one<{ total: number }>(countQuery);

        return {
            leads,
            count: total
        };
    }

    async trashLead(leadId: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET deleted = now()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.one(query, { id: leadId });
    }

    async createLeads(
        leads: Array<parsedLeadFromCSV>,
    ): Promise<Array<{ success: boolean; lead?: Lead; failedLead?: parsedLeadFromCSV; error?: string }>> {
        return this.db.task(async t => {
            console.log(`Inserting ${leads.length} leads into the database...`);
            const results: Array<{
                success: boolean;
                lead?: Lead;
                failedLead?: parsedLeadFromCSV;
                error?: string
            }> = [];

            for (const lead of leads) {
                try {
                    const postedLead: Lead = await t.one(
                        `
                          INSERT INTO leads (
                            first_name, last_name, email, phone, address, city, state, zipcode, county, county_id, imported_at
                          )
                          VALUES (
                            $[first_name], $[last_name], $[email], $[phone], $[address], $[city], $[state], $[zipcode], $[county], $[county_id], $[imported_at]
                          )
                          RETURNING *;
                        `,
                        { ...lead }
                    );

                    results.push({ success: true, lead: postedLead });
                } catch (e) {
                    const error = e as { message?: string };
                    results.push({
                        success: false,
                        failedLead: lead,
                        error: error?.message ?? "Unknown error"
                    });
                }
            }

            return results;
        });
    }
}