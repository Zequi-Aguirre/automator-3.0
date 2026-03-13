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
    ): Promise<string[]> {
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

        return rows.map(r => r.id);
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

    // Get lead by ID (active only)
    async getById(id: string): Promise<Lead | null> {
        const query = `
            SELECT *
            FROM leads
            WHERE id = $[id]
            AND deleted IS NULL;
        `;
        return await this.db.oneOrNone<Lead>(query, { id });
    }

    // Get lead by ID including deleted/trashed leads
    async getByIdAny(id: string): Promise<Lead | null> {
        const query = `
            SELECT *
            FROM leads
            WHERE id = $[id];
        `;
        return await this.db.oneOrNone<Lead>(query, { id });
    }

    // Untrash a lead
    async untrashLead(id: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET deleted = NULL,
                deleted_reason = NULL,
                modified = NOW()
            WHERE id = $[id]
            RETURNING *;
        `;
        const result = await this.db.oneOrNone<Lead>(query, { id });
        if (!result) {
            throw new Error('Lead not found');
        }
        return result;
    }

    async getMany(filters: {
        page: number;
        limit: number;
        search?: string;
        status?: "new" | "verified" | "sent" | "sold" | "trash";
    }): Promise<{ leads: Lead[]; count: number }> {
        const { page, limit, search, status } = filters;
        const offset = (page - 1) * limit;

        const whereClauses: string[] = [];

        // STATUS FILTER
        switch (status) {
            case "new":
                whereClauses.push(`
                l.verified = FALSE
                AND l.deleted IS NULL
                AND NOT EXISTS (SELECT 1 FROM send_log sl WHERE sl.lead_id = l.id AND sl.response_code >= 200 AND sl.response_code < 300)
            `);
                break;

            case "verified":
                whereClauses.push(`
                l.verified = TRUE
                AND l.deleted IS NULL
                AND NOT EXISTS (SELECT 1 FROM send_log sl WHERE sl.lead_id = l.id AND sl.response_code >= 200 AND sl.response_code < 300)
            `);
                break;

            case "sent":
                whereClauses.push(`
                l.deleted IS NULL
                AND EXISTS (SELECT 1 FROM send_log sl WHERE sl.lead_id = l.id AND sl.response_code >= 200 AND sl.response_code < 300)
            `);
                break;

            case "sold":
                whereClauses.push(`
                l.deleted IS NULL
                AND EXISTS (SELECT 1 FROM lead_buyer_outcomes lbo WHERE lbo.lead_id = l.id AND lbo.status = 'sold' AND lbo.deleted IS NULL)
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
            LEFT JOIN campaigns c ON c.id = l.campaign_id AND c.deleted IS NULL
            ${whereSQL}
        `;

        const leadsQuery = `
            SELECT l.*,
                   c.name AS campaign_name,
                   c.platform AS campaign_platform
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

    async getLeadsToSendByWorker(buyerId?: string, buyerPriority?: number): Promise<Lead[]> {
        const query = buyerId && buyerPriority !== undefined
            ? `
                SELECT l.*
                FROM leads l
                WHERE l.worker_enabled = TRUE
                AND l.deleted IS NULL
                -- Exclude leads already successfully sent to THIS buyer
                AND NOT EXISTS (
                    SELECT 1 FROM send_log sl
                    WHERE sl.lead_id = l.id
                    AND sl.buyer_id = $[buyerId]::uuid
                    AND sl.status = 'sent'
                    AND sl.deleted IS NULL
                )
                -- Exclude leads sold to higher-priority buyers (where allow_resell=false)
                AND NOT EXISTS (
                    SELECT 1
                    FROM lead_buyer_outcomes lbo
                    JOIN buyers b ON lbo.buyer_id = b.id
                    WHERE lbo.lead_id = l.id
                    AND lbo.status = 'sold'
                    AND b.priority < $[buyerPriority]
                    AND lbo.allow_resell = false
                    AND lbo.deleted IS NULL
                    AND b.deleted IS NULL
                )
                ORDER BY l.created ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED;
            `
            : `
                SELECT *
                FROM leads
                WHERE worker_enabled = TRUE
                AND deleted IS NULL
                ORDER BY created ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED;
            `;

        return buyerId && buyerPriority !== undefined
            ? await this.db.manyOrNone<Lead>(query, { buyerId, buyerPriority })
            : await this.db.manyOrNone<Lead>(query);
    }

    async getVerifiedLeadsForWorker(buyerId?: string, buyerPriority?: number): Promise<Lead[]> {
        const query = buyerId && buyerPriority !== undefined
            ? `
                SELECT l.*
                FROM leads l
                WHERE l.worker_enabled = TRUE
                AND l.verified = TRUE
                AND l.deleted IS NULL
                -- Exclude leads already successfully sent to THIS buyer
                AND NOT EXISTS (
                    SELECT 1 FROM send_log sl
                    WHERE sl.lead_id = l.id
                    AND sl.buyer_id = $[buyerId]::uuid
                    AND sl.status = 'sent'
                    AND sl.deleted IS NULL
                )
                -- Exclude leads sold to higher-priority buyers (where allow_resell=false)
                AND NOT EXISTS (
                    SELECT 1
                    FROM lead_buyer_outcomes lbo
                    JOIN buyers b ON lbo.buyer_id = b.id
                    WHERE lbo.lead_id = l.id
                    AND lbo.status = 'sold'
                    AND b.priority < $[buyerPriority]
                    AND lbo.allow_resell = false
                    AND lbo.deleted IS NULL
                    AND b.deleted IS NULL
                )
                ORDER BY l.created ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED;
            `
            : `
                SELECT *
                FROM leads
                WHERE worker_enabled = TRUE
                AND verified = TRUE
                AND deleted IS NULL
                ORDER BY created ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED;
            `;

        return buyerId && buyerPriority !== undefined
            ? await this.db.manyOrNone<Lead>(query, { buyerId, buyerPriority })
            : await this.db.manyOrNone<Lead>(query);
    }

    async getUnverifiedLeadsForWorker(buyerId?: string, buyerPriority?: number): Promise<Lead[]> {
        const query = buyerId && buyerPriority !== undefined
            ? `
                SELECT l.*
                FROM leads l
                WHERE l.worker_enabled = TRUE
                AND l.verified = FALSE
                AND l.deleted IS NULL
                -- Exclude leads already successfully sent to THIS buyer
                AND NOT EXISTS (
                    SELECT 1 FROM send_log sl
                    WHERE sl.lead_id = l.id
                    AND sl.buyer_id = $[buyerId]::uuid
                    AND sl.status = 'sent'
                    AND sl.deleted IS NULL
                )
                -- Exclude leads sold to higher-priority buyers (where allow_resell=false)
                AND NOT EXISTS (
                    SELECT 1
                    FROM lead_buyer_outcomes lbo
                    JOIN buyers b ON lbo.buyer_id = b.id
                    WHERE lbo.lead_id = l.id
                    AND lbo.status = 'sold'
                    AND b.priority < $[buyerPriority]
                    AND lbo.allow_resell = false
                    AND lbo.deleted IS NULL
                    AND b.deleted IS NULL
                )
                ORDER BY l.created ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED;
            `
            : `
                SELECT *
                FROM leads
                WHERE worker_enabled = TRUE
                AND verified = FALSE
                AND deleted IS NULL
                ORDER BY created ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED;
            `;

        return buyerId && buyerPriority !== undefined
            ? await this.db.manyOrNone<Lead>(query, { buyerId, buyerPriority })
            : await this.db.manyOrNone<Lead>(query);
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
                    // TICKET-047: Ensure all fields exist (set to null if not provided)
                    const params = {
                        first_name: lead.first_name,
                        last_name: lead.last_name,
                        email: lead.email ?? null,
                        phone: lead.phone ?? null,
                        address: lead.address,
                        city: lead.city,
                        state: lead.state,
                        zipcode: lead.zipcode ?? null,
                        county: lead.county ?? null,
                        county_id: lead.county_id ?? null,
                        source_id: lead.source_id,
                        campaign_id: lead.campaign_id,
                        external_lead_id: lead.external_lead_id ?? null,
                        external_ad_id: lead.external_ad_id ?? null,
                        external_ad_name: lead.external_ad_name ?? null,
                        raw_payload: lead.raw_payload ?? null
                    };

                    const postedLead: Lead = await t.one(
                        `
                          INSERT INTO leads (
                            first_name, last_name, email, phone, address, city, state, zipcode,
                            county, county_id, source_id, campaign_id,
                            external_lead_id, external_ad_id, external_ad_name, raw_payload
                          )
                          VALUES (
                            $[first_name], $[last_name], $[email], $[phone], $[address], $[city], $[state], $[zipcode],
                            $[county], $[county_id], $[source_id], $[campaign_id],
                            $[external_lead_id], $[external_ad_id], $[external_ad_name], $[raw_payload]
                          )
                          RETURNING *;
                        `,
                        params
                    );

                    results.push({ success: true, lead: postedLead });
                } catch (e) {
                    const error = e as { message?: string };

                    // Check for duplicate external_lead_id error
                    if (error?.message?.includes('idx_leads_external_unique')) {
                        results.push({
                            success: false,
                            failedLead: lead,
                            error: `Duplicate lead: external_lead_id '${lead.external_lead_id}' already exists for this source`
                        });
                    } else {
                        results.push({
                            success: false,
                            failedLead: lead,
                            error: error?.message ?? "Unknown error"
                        });
                    }
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
                county, county_id,
                deleted, deleted_reason
            )
            VALUES (
                $[first_name], $[last_name], $[email], $[phone],
                $[address], $[city], $[state], $[zipcode],
                $[county], $[county_id],
                NOW(), $[reason]
            )
            RETURNING *;
        `, { ...lead, reason }
        );
    }

    async queueLead(id: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET worker_enabled = true,
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Lead>(query, { id });
        if (!result) {
            throw new Error("Lead not found or update failed");
        }

        return result;
    }

    async unqueueLead(id: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET worker_enabled = false,
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Lead>(query, { id });
        if (!result) {
            throw new Error("Lead not found or update failed");
        }

        return result;
    }
}