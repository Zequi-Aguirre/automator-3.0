import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { DBContainer } from "../config/DBContainer";
import { Campaign } from "../types/campaignTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

@injectable()
export default class CampaignDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getById(campaignId: string): Promise<Campaign> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE id = $[campaignId]
              AND deleted IS NULL;
        `;
        return await this.db.one<Campaign>(query, { campaignId });
    }

    async getByAffiliateId(affiliateId: string): Promise<Campaign[]> {
        const query = `
        SELECT *
        FROM campaigns
        WHERE affiliate_id = $[affiliateId]
          AND deleted IS NULL
        ORDER BY modified DESC;
    `;
        return await this.db.manyOrNone<Campaign>(query, { affiliateId });
    }

    async insertCampaign(data: { name: string; affiliate_id: string }): Promise<Campaign> {
        const query = `
        INSERT INTO campaigns (name, affiliate_id)
        VALUES ($[name], $[affiliate_id])
        RETURNING *;
    `;
        return await this.db.one<Campaign>(query, data);
    }

    async getMany(filters: { page: number; limit: number }): Promise<{ campaigns: Campaign[]; count: number }> {
        const { page, limit } = filters;
        const offset = (page - 1) * limit;

        // Query #1: Get paginated campaigns
        const campaignsQuery = `
            SELECT *
            FROM campaigns
            WHERE deleted IS NULL
            ORDER BY modified DESC
            LIMIT $1 OFFSET $2
        `;
        const campaigns = await this.db.manyOrNone<Campaign>(campaignsQuery, [limit, offset]);

        // Query #2: Get total count (ignores pagination)
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM campaigns
            WHERE deleted IS NULL
        `;
        const { total } = await this.db.one<{ total: number }>(countQuery);

        return {
            campaigns,
            count: total
        };
    }

    async getAllCampaigns(): Promise<Campaign[]> {
        const query = `
            SELECT * 
            FROM campaigns 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<Campaign[]>(query);
    }

    async updateCampaignMetadata(
        id: string,
        updates: Partial<Pick<Campaign, 'rating' | 'blacklisted'>>
    ): Promise<Campaign> {
        const fields: string[] = [];
        if (updates.rating !== undefined) fields.push('rating = $[rating]');
        if (updates.blacklisted !== undefined) fields.push('blacklisted = $[blacklisted]');

        const setClause = fields.join(', ');
        const query = `
            UPDATE campaigns
            SET ${setClause},
                modified = NOW()
            WHERE id = $[id]
            RETURNING *;
        `;

        return await this.db.one<Campaign>(query, { ...updates, id });
    }
}