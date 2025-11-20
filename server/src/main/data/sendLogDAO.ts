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
                investor_id,
                status
            )
            VALUES (
                $[lead_id],
                $[affiliate_id],
                $[campaign_id],
                $[investor_id],
                $[status]
            )
            RETURNING *;
        `;

        return await this.db.one<SendLog>(query, data);
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

    async updateLog(id: string, updates: SendLogUpdate): Promise<SendLog> {
        const query = `
            UPDATE send_log
            SET
                response_code = COALESCE($[response_code], response_code),
                response_body = COALESCE($[response_body], response_body),
                payout_cents = COALESCE($[payout_cents], payout_cents),
                status = COALESCE($[status], status),
                modified = NOW()
            WHERE id = $[id]
            RETURNING *;
        `;

        return await this.db.one<SendLog>(query, { id, ...updates });
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
        // Using leads table to map county
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