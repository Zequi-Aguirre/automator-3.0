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
                affiliate_id,
                campaign_id,
                status
            )
            VALUES (
                $[lead_id],
                $[affiliate_id],
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
        affiliate_id?: string;
        campaign_id?: string;
        county_id?: string;
    }): Promise<{ logs: SendLog[]; count: number }> {
        const {
            page,
            limit,
            status,
            affiliate_id,
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
        if (affiliate_id !== undefined) {
            where.push("sl.affiliate_id = $[affiliate_id]");
            params.affiliate_id = affiliate_id;
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
            SELECT sl.*
            FROM send_log sl
            JOIN leads l ON sl.lead_id = l.id
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
}