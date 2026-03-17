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
              AND NOT EXISTS (
                  SELECT 1 FROM send_log
                  WHERE send_log.lead_id = leads.id
                    AND send_log.response_code >= 200
                    AND send_log.response_code < 300
                    AND send_log.deleted IS NULL
              )
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

    // Get lead by ID (active only)
    async getById(id: string): Promise<Lead | null> {
        const query = `
            SELECT l.*, c.name AS campaign_name, c.platform AS campaign_platform
            FROM leads l
            LEFT JOIN campaigns c ON c.id = l.campaign_id AND c.deleted IS NULL
            WHERE l.id = $[id]
            AND l.deleted IS NULL;
        `;
        return await this.db.oneOrNone<Lead>(query, { id });
    }

    // Get lead by ID including deleted/trashed leads
    async getByIdAny(id: string): Promise<Lead | null> {
        const query = `
            SELECT l.*, c.name AS campaign_name, c.platform AS campaign_platform
            FROM leads l
            LEFT JOIN campaigns c ON c.id = l.campaign_id AND c.deleted IS NULL
            WHERE l.id = $[id];
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
        status?: "needs_review" | "needs_call" | "new" | "verified" | "sent" | "sold" | "trash";
        buyer_id?: string;
        send_source?: string;
        source_id?: string;
        campaign_id?: string;
        expireHours?: number;
    }): Promise<{ leads: Lead[]; count: number }> {
        const { page, limit, search, status, buyer_id, send_source, source_id, campaign_id, expireHours } = filters;
        const offset = (page - 1) * limit;

        const whereClauses: string[] = [];
        const params: Record<string, unknown> = { limit, offset, search };

        // STATUS FILTER
        switch (status) {
            case "needs_call":
                whereClauses.push(`
                l.needs_call = TRUE
                AND l.deleted IS NULL
            `);
                break;

            case "needs_review":
                whereClauses.push(`
                l.needs_review = TRUE
                AND l.deleted IS NULL
            `);
                break;

            case "new":
                if (expireHours !== undefined) {
                    params.expireHours = expireHours;
                    whereClauses.push(`
                    l.verified = FALSE
                    AND l.needs_review = FALSE
                    AND l.needs_call = FALSE
                    AND l.deleted IS NULL
                    AND l.created > NOW() - ($[expireHours]::int * INTERVAL '1 hour')
                `);
                } else {
                    whereClauses.push(`
                    l.verified = FALSE
                    AND l.needs_review = FALSE
                    AND l.needs_call = FALSE
                    AND l.deleted IS NULL
                `);
                }
                break;

            case "verified":
                whereClauses.push(`
                l.verified = TRUE
                AND l.deleted IS NULL
                AND NOT EXISTS (SELECT 1 FROM send_log sl WHERE sl.lead_id = l.id AND sl.response_code >= 200 AND sl.response_code < 300)
            `);
                break;

            case "sent": {
                // Build the send_log subquery with optional buyer/source filters
                const sentSubConditions = [
                    'sl.lead_id = l.id',
                    'sl.response_code >= 200',
                    'sl.response_code < 300',
                    'sl.deleted IS NULL'
                ];
                if (buyer_id) {
                    sentSubConditions.push('sl.buyer_id = $[buyer_id]');
                    params.buyer_id = buyer_id;
                }
                if (send_source) {
                    sentSubConditions.push('sl.send_source = $[send_source]');
                    params.send_source = send_source;
                }
                whereClauses.push(`
                l.deleted IS NULL
                AND EXISTS (SELECT 1 FROM send_log sl WHERE ${sentSubConditions.join(' AND ')})
            `);
                break;
            }

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
            whereClauses.push(`l.county ILIKE '%' || $[search] || '%'`);
        }

        // TICKET-066: Sent tab source/campaign filters
        if (source_id) {
            whereClauses.push(`l.source_id = $[source_id]`);
            params.source_id = source_id;
        }
        if (campaign_id) {
            whereClauses.push(`l.campaign_id = $[campaign_id]`);
            params.campaign_id = campaign_id;
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
            LIMIT $[limit]
            OFFSET $[offset];
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            ${baseQuery};
        `;

        const leads = await this.db.manyOrNone<Lead>(leadsQuery, params);

        const { total } = await this.db.one<{ total: number }>(countQuery, params);

        return { leads, count: total };
    }

    async getLeadsToSendByWorker(buyerId?: string, buyerPriority?: number): Promise<Lead[]> {
        const query = buyerId && buyerPriority !== undefined
            ? `
                SELECT l.*
                FROM leads l
                WHERE l.queued = TRUE
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
                WHERE queued = TRUE
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
                WHERE l.queued = TRUE
                AND l.verified = TRUE
                AND l.needs_call = FALSE
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
                WHERE queued = TRUE
                AND verified = TRUE
                AND needs_call = FALSE
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
                WHERE l.queued = TRUE
                AND l.verified = FALSE
                AND l.needs_call = FALSE
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
                WHERE queued = TRUE
                AND verified = FALSE
                AND needs_call = FALSE
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
                        raw_payload: lead.raw_payload ?? null,
                        needs_review: lead.needs_review ?? false,
                        needs_review_reason: lead.needs_review_reason ?? null
                    };

                    const postedLead: Lead = await t.one(
                        `
                          INSERT INTO leads (
                            first_name, last_name, email, phone, address, city, state, zipcode,
                            county, county_id, source_id, campaign_id,
                            external_lead_id, external_ad_id, external_ad_name, raw_payload,
                            needs_review, needs_review_reason
                          )
                          VALUES (
                            $[first_name], $[last_name], $[email], $[phone], $[address], $[city], $[state], $[zipcode],
                            $[county], $[county_id], $[source_id], $[campaign_id],
                            $[external_lead_id], $[external_ad_id], $[external_ad_name], $[raw_payload],
                            $[needs_review], $[needs_review_reason]
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

    async resolveNeedsReview(id: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET needs_review = FALSE,
                needs_review_reason = NULL,
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;
        const result = await this.db.oneOrNone<Lead>(query, { id });
        if (!result) {
            throw new Error('Lead not found');
        }
        return result;
    }

    async requestCall(id: string, reason: string, requestedBy: string, note?: string | null): Promise<Lead> {
        const query = `
            UPDATE leads
            SET needs_call = TRUE,
                call_reason = $[reason],
                call_request_note = $[note],
                call_requested_at = NOW(),
                call_requested_by = $[requestedBy],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;
        const result = await this.db.oneOrNone<Lead>(query, { id, reason, note: note ?? null, requestedBy });
        if (!result) {
            throw new Error('Lead not found');
        }
        return result;
    }

    async executeCall(
        id: string,
        outcome: string,
        notes: string | null,
        executedBy: string
    ): Promise<Lead> {
        const resolved = outcome === 'resolved';
        const query = `
            UPDATE leads
            SET needs_call = $[needsCall],
                call_executed_at = NOW(),
                call_executed_by = $[executedBy],
                call_outcome = $[outcome],
                call_outcome_notes = $[notes],
                call_attempts = call_attempts + 1,
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;
        const result = await this.db.oneOrNone<Lead>(query, {
            id,
            needsCall: !resolved,
            executedBy,
            outcome,
            notes
        });
        if (!result) {
            throw new Error('Lead not found');
        }
        return result;
    }

    async queueLead(id: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET queued = true,
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

    async getTabCounts(expireHours: number): Promise<{ new: number; verified: number; needs_review: number; needs_call: number }> {
        const query = `
            SELECT
                (SELECT COUNT(*)::int FROM leads WHERE verified = FALSE AND needs_review = FALSE AND needs_call = FALSE AND deleted IS NULL AND created > NOW() - ($[expireHours]::int * INTERVAL '1 hour')) AS "new",
                (SELECT COUNT(*)::int FROM leads WHERE verified = TRUE AND deleted IS NULL AND NOT EXISTS (SELECT 1 FROM send_log sl WHERE sl.lead_id = leads.id AND sl.response_code >= 200 AND sl.response_code < 300)) AS "verified",
                (SELECT COUNT(*)::int FROM leads WHERE needs_review = TRUE AND deleted IS NULL) AS "needs_review",
                (SELECT COUNT(*)::int FROM leads WHERE needs_call = TRUE AND deleted IS NULL) AS "needs_call";
        `;
        return this.db.one(query, { expireHours });
    }

    async unqueueLead(id: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET queued = false,
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