import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { Affiliate } from "../types/affiliateTypes.ts";

@injectable()
export default class AffiliateDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async insertAffiliate(data: {
        name: string;
    }): Promise<Affiliate> {
        const query = `
            INSERT INTO affiliates (name)
            VALUES ($[name])
            RETURNING *;
        `;
        return await this.db.one<Affiliate>(query, data);
    }

    async getMany(filters: { page: number; limit: number }): Promise<{ affiliates: Affiliate[]; count: number }> {
        const { page, limit } = filters;
        const offset = (page - 1) * limit;

        const listQuery = `
            SELECT *
            FROM affiliates
            WHERE deleted IS NULL
            ORDER BY modified DESC
            LIMIT $[limit] OFFSET $[offset];
        `;
        const affiliates = await this.db.manyOrNone<Affiliate>(listQuery, { limit, offset });

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM affiliates
            WHERE deleted IS NULL;
        `;
        const { total } = await this.db.one<{ total: number }>(countQuery);

        return { affiliates, count: total };
    }

    async getAffiliateById(id: string): Promise<Affiliate> {
        const query = `
        SELECT *
        FROM affiliates
        WHERE id = $[id]
          AND deleted IS NULL;
    `;
        return await this.db.one<Affiliate>(query, { id });
    }

    async getAffiliatesByIds(ids: string[]): Promise<Affiliate[]> {
        const query = `
            SELECT * 
            FROM affiliates 
            WHERE id IN ($[ids:csv]) 
              AND deleted IS NULL;
        `;
        return await this.db.query<Affiliate[]>(query, { ids });
    }

    async getAllAffiliates(): Promise<Affiliate[]> {
        const query = `
            SELECT * 
            FROM affiliates 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<Affiliate[]>(query);
    }

    async updateAffiliate(id: string, updates: Partial<Pick<Affiliate, 'rating' | 'blacklisted'>>): Promise<Affiliate> {
        const fields: string[] = [];
        if (updates.rating !== undefined) fields.push('rating = $[rating]');
        if (updates.blacklisted !== undefined) fields.push('blacklisted = $[blacklisted]');

        const setClause = fields.join(', ');
        const query = `
        UPDATE affiliates
        SET ${setClause},
            modified = NOW()
        WHERE id = $[id]
        RETURNING *;
    `;

        return await this.db.one<Affiliate>(query, { ...updates, id });
    }
}