import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { Lead, LeadUpdateAllowedFieldsType, parsedLeadFromCSV } from "../types/leadTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

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

    async trashExpiredLeads(
        expireHours: number,
        reason: string
    ): Promise<number> {
        const query = `
            UPDATE leads
            SET
                deleted = NOW(),
                deleted_reason = $[reason],
                modified = NOW()
            WHERE deleted IS NULL
              AND sent = FALSE
              AND created <= NOW() - ($[expireHours]::int * INTERVAL '1 hour')
            RETURNING id;
        `;

        const rows = await this.db.manyOrNone<{ id: string }>(query, {
            expireHours,
            reason
        });

        return rows.length;
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

    // Mark lead sent and sent_date
    async markLeadAsSent(leadId: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET sent = TRUE,
                sent_date = NOW(),
                modified = NOW()
            WHERE id = $[leadId]
            AND deleted IS NULL
            RETURNING *;
        `;
        const result = await this.db.oneOrNone<Lead>(query, { leadId });
        if (!result) {
            throw new Error("Lead not found or mark as sent failed");
        }
        return result;
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

    async getMany(filters: {
        page: number;
        limit: number;
        search?: string;
        status?: "new" | "verified" | "sent" | "trash";
    }): Promise<{ leads: Lead[]; count: number }> {
        const { page, limit, search, status } = filters;
        const offset = (page - 1) * limit;

        const whereClauses: string[] = [];

        // STATUS FILTER
        switch (status) {
            case "new":
                whereClauses.push(`
                l.sent = FALSE
                AND l.verified = FALSE
                AND l.deleted IS NULL
            `);
                break;

            case "verified":
                whereClauses.push(`
                l.verified = TRUE
                AND l.sent = FALSE
                AND l.deleted IS NULL
            `);
                break;

            case "sent":
                whereClauses.push(`
                l.sent = TRUE
                AND l.deleted IS NULL
            `);
                break;

            case "trash":
                whereClauses.push(`
                l.deleted IS NOT NULL
            `);
                break;

            default:
                whereClauses.push(`
                l.deleted IS NULL
            `);
        }

        // SEARCH FILTER
        if (search) {
            whereClauses.push(`l.county ILIKE '%' || $/search/ || '%'`);
        }

        const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

        const baseQuery = `
            FROM leads l
            ${whereSQL}
        `;

        const leadsQuery = `
            SELECT l.*
            ${baseQuery}
            ORDER BY l.modified DESC
            LIMIT $/limit/
            OFFSET $/offset/;
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            ${baseQuery};
        `;

        const leads = await this.db.manyOrNone<Lead>(leadsQuery, {
            limit,
            offset,
            search
        });

        const { total } = await this.db.one<{ total: number }>(countQuery, { search });

        return { leads, count: total };
    }

    async getLeadsToSendByWorker(): Promise<Lead[]> {
        const query = `
            SELECT *
            FROM leads
            WHERE verified = TRUE
            AND deleted IS NULL
            AND sent = FALSE
            ORDER BY RANDOM();
        `;

        return await this.db.manyOrNone<Lead>(query);
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
                            first_name, last_name, email, phone, address, city, state, zipcode,
                            county, county_id, private_notes, investor_id
                          )
                          VALUES (
                            $[first_name], $[last_name], $[email], $[phone], $[address], $[city], $[state], $[zipcode],
                            $[county], $[county_id], $[private_notes], $[investor_id]
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

    async trashLeadWithReason(id: string, reason: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET deleted = NOW(),
                deleted_reason = $[reason]
            WHERE id = $[id]
            RETURNING *;
        `;

        return this.db.one(query, { id, reason });
    }

    async createTrashedLead(lead: parsedLeadFromCSV, reason: string): Promise<Lead> {
        return this.db.one(
            `
            INSERT INTO leads (
                first_name, last_name, email, phone,
                address, city, state, zipcode,
                county, county_id, private_notes,
                investor_id,
                deleted, deleted_reason
            )
            VALUES (
                $[first_name], $[last_name], $[email], $[phone],
                $[address], $[city], $[state], $[zipcode],
                $[county], $[county_id], $[private_notes],
                $[investor_id],
                NOW(), $[reason]
            )
            RETURNING *;
        `, { ...lead, reason }
        );
    }
}