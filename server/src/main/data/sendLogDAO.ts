import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { SendLog, SendLogInsert, SendLogUpdate } from "../types/sendLogTypes";

@injectable()
export default class SendLogDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async createLog(data: SendLogInsert): Promise<SendLog> {
        const query = `
            INSERT INTO send_log (
                lead_id,
                buyer_id,
                source_id,
                campaign_id,
                status
            )
            VALUES (
                $[lead_id],
                $[buyer_id],
                $[source_id],
                $[campaign_id],
                $[status]
            )
            RETURNING *;
        `;
        return await this.db.one<SendLog>(query, data);
    }

    async getMany(filters: {
        page: number;
        limit: number;
        status?: string;
        investor_id?: string;
        source_id?: string;  // TICKET-046: Renamed from affiliate_id
        campaign_id?: string;
        county_id?: string;
    }): Promise<{ logs: SendLog[]; count: number }> {
        const {
            page,
            limit,
            status,
            investor_id,
            source_id,
            campaign_id,
            county_id,
        } = filters;

        const offset = (page - 1) * limit;

        const where: string[] = ["sl.deleted IS NULL"];
        const params: Record<string, any> = { limit, offset };

        if (status !== undefined) {
            where.push("sl.status = $[status]");
            params.status = status;
        }
        if (investor_id !== undefined) {
            where.push("sl.investor_id = $[investor_id]");
            params.investor_id = investor_id;
        }
        if (source_id !== undefined) {
            where.push("sl.source_id = $[source_id]");
            params.source_id = source_id;
        }
        if (campaign_id !== undefined) {
            where.push("sl.campaign_id = $[campaign_id]");
            params.campaign_id = campaign_id;
        }
        if (county_id !== undefined) {
            where.push("l.county_id = $[county_id]");
            params.county_id = county_id;
        }

        const whereClause = `WHERE ${where.join(" AND ")}`;

        const listQuery = `
            SELECT
                sl.*,
                l.first_name  AS lead_first_name,
                l.last_name   AS lead_last_name,
                l.county      AS lead_county,
                l.state       AS lead_state,
                c.name        AS campaign_name,
                c.platform    AS campaign_platform
            FROM send_log sl
            JOIN leads l ON sl.lead_id = l.id
            LEFT JOIN campaigns c ON sl.campaign_id = c.id
            ${whereClause}
            ORDER BY sl.created DESC
            LIMIT $[limit] OFFSET $[offset];
        `;

        const logs = await this.db.manyOrNone<SendLog>(listQuery, params);

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM send_log sl
            JOIN leads l ON sl.lead_id = l.id
            ${whereClause};
        `;

        const { total } = await this.db.one<{ total: number }>(countQuery, params);

        return { logs, count: total };
    }

    async updateLog(id: string, updates: SendLogUpdate): Promise<SendLog> {
        const fields: string[] = [];

        if (updates.response_code !== undefined) {
            fields.push("response_code = $[response_code]");
        }
        if (updates.response_body !== undefined) {
            fields.push("response_body = $[response_body]");
        }
        if (updates.payout_cents !== undefined) {
            fields.push("payout_cents = $[payout_cents]");
        }
        if (updates.status !== undefined) {
            fields.push("status = $[status]");
        }

        if (fields.length === 0) {
            throw new Error("No valid send_log fields provided for update");
        }

        const query = `
            UPDATE send_log
            SET
                ${fields.join(", ")},
                modified = NOW()
            WHERE id = $[id]
              AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.one<SendLog>(query, { id, ...updates });
    }

    async getLatestLogsByInvestorIds(investorIds: string[]): Promise<SendLog[]> {
        const query = `
            SELECT DISTINCT ON (sl.investor_id)
                sl.*
            FROM send_log sl
            WHERE sl.investor_id = ANY($[investorIds]::uuid[])
              AND sl.deleted IS NULL
            ORDER BY sl.investor_id, sl.created DESC;
        `;
        return await this.db.manyOrNone<SendLog>(query, { investorIds });
    }

    async getLatestLogsByCountyIds(countyIds: string[]): Promise<SendLog[]> {
        const query = `
            SELECT DISTINCT ON (l.county_id)
                sl.*,
                l.county_id
            FROM send_log sl
            JOIN leads l ON sl.lead_id = l.id
            WHERE l.county_id = ANY($[countyIds]::uuid[])
              AND sl.deleted IS NULL
            ORDER BY l.county_id, sl.created DESC;
        `;
        return await this.db.manyOrNone<SendLog>(query, { countyIds });
    }

    async getLatestLogsByBuyerAndCounties(buyerId: string, countyIds: string[]): Promise<SendLog[]> {
        const query = `
            SELECT DISTINCT ON (l.county_id)
                sl.*,
                l.county_id
            FROM send_log sl
            JOIN leads l ON sl.lead_id = l.id
            WHERE sl.buyer_id = $[buyerId]::uuid
              AND l.county_id = ANY($[countyIds]::uuid[])
              AND sl.deleted IS NULL
            ORDER BY l.county_id, sl.created DESC;
        `;
        return await this.db.manyOrNone<SendLog>(query, { buyerId, countyIds });
    }

    async getLatestLogsByBuyerAndStates(buyerId: string, states: string[]): Promise<SendLog[]> {
        const query = `
            SELECT DISTINCT ON (l.state)
                sl.*,
                l.state
            FROM send_log sl
            JOIN leads l ON sl.lead_id = l.id
            WHERE sl.buyer_id = $[buyerId]::uuid
              AND l.state = ANY($[states]::text[])
              AND sl.deleted IS NULL
            ORDER BY l.state, sl.created DESC;
        `;
        return await this.db.manyOrNone<SendLog>(query, { buyerId, states });
    }

    async getLastByInvestor(investorId: string): Promise<SendLog | null> {
        const query = `
            SELECT *
            FROM send_log
            WHERE investor_id = $[investorId]
              AND deleted IS NULL
            ORDER BY created DESC
            LIMIT 1;
        `;
        return await this.db.oneOrNone<SendLog>(query, { investorId });
    }

    async getLastByCounty(countyId: string): Promise<SendLog | null> {
        const query = `
            SELECT sl.*
            FROM send_log sl
            JOIN leads l ON sl.lead_id = l.id
            WHERE l.county_id = $[countyId]
              AND sl.deleted IS NULL
            ORDER BY sl.created DESC
            LIMIT 1;
        `;
        return await this.db.oneOrNone<SendLog>(query, { countyId });
    }

    async getByLeadIdGroupedByBuyer(leadId: string): Promise<SendLog[]> {
        const query = `
            SELECT
                sl.*,
                b.name AS buyer_name
            FROM send_log sl
            JOIN buyers b ON sl.buyer_id = b.id
            WHERE sl.lead_id = $[leadId]
              AND sl.deleted IS NULL
              AND b.deleted IS NULL
            ORDER BY b.priority ASC, sl.created DESC;
        `;
        return await this.db.manyOrNone<SendLog>(query, { leadId });
    }

    async wasSuccessfullySentToBuyer(leadId: string, buyerId: string): Promise<boolean> {
        const query = `
            SELECT EXISTS (
                SELECT 1
                FROM send_log
                WHERE lead_id = $[leadId]
                  AND buyer_id = $[buyerId]
                  AND response_code >= 200
                  AND response_code < 300
                  AND deleted IS NULL
            ) AS exists;
        `;
        const result = await this.db.one<{ exists: boolean }>(query, { leadId, buyerId });
        return result.exists;
    }

    async getBuyersNotSentForLead(leadId: string): Promise<string[]> {
        const query = `
            SELECT b.id
            FROM buyers b
            WHERE b.deleted IS NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM send_log sl
                  WHERE sl.buyer_id = b.id
                    AND sl.lead_id = $[leadId]
                    AND sl.deleted IS NULL
              )
            ORDER BY b.priority ASC;
        `;
        const results = await this.db.manyOrNone<{ id: string }>(query, { leadId });
        return results.map(r => r.id);
    }

    async getLatestLogsByBuyerIds(buyerIds: string[]): Promise<SendLog[]> {
        const query = `
            SELECT DISTINCT ON (sl.buyer_id)
                sl.*
            FROM send_log sl
            WHERE sl.buyer_id = ANY($[buyerIds]::uuid[])
              AND sl.deleted IS NULL
            ORDER BY sl.buyer_id, sl.created DESC;
        `;
        return await this.db.manyOrNone<SendLog>(query, { buyerIds });
    }
}