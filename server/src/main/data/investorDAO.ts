import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { Investor } from "../types/investorTypes";

@injectable()
export default class InvestorDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async insertInvestor(data: {
        name: string;
    }): Promise<Investor> {
        const query = `
            INSERT INTO investors (name)
            VALUES ($[name])
            RETURNING *;
        `;
        return await this.db.one<Investor>(query, data);
    }

    async getMany(filters: { page: number; limit: number }): Promise<{ investors: Investor[]; count: number }> {
        const { page, limit } = filters;
        const offset = (page - 1) * limit;

        const listQuery = `
            SELECT *
            FROM investors
            WHERE deleted IS NULL
            ORDER BY modified DESC
            LIMIT $[limit] OFFSET $[offset];
        `;
        const investors = await this.db.manyOrNone<Investor>(listQuery, { limit, offset });

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM investors
            WHERE deleted IS NULL;
        `;
        const { total } = await this.db.one<{ total: number }>(countQuery);

        return { investors, count: total };
    }

    async getById(id: string): Promise<Investor | null> {
        const query = `
            SELECT *
            FROM investors
            WHERE id = $[id]
            AND deleted IS NULL;
        `;
        return await this.db.oneOrNone<Investor>(query, { id });
    }

    async getAllInvestors(): Promise<Investor[]> {
        const query = `
            SELECT *
            FROM investors
            WHERE deleted IS NULL;
        `;
        return await this.db.query<Investor[]>(query);
    }

    async getManyByIds(ids: string[]): Promise<Investor[]> {
        if (ids.length === 0) return [];
        const query = `
            SELECT *
            FROM investors
            WHERE id IN ($[ids:csv]) AND deleted IS NULL;
        `;
        return this.db.any<Investor>(query, { ids });
    }

    async updateInvestor(
        id: string,
        updates: Partial<Pick<Investor, "name" | "whitelisted" | "blacklisted" | "rating">>
    ): Promise<Investor> {
        const fields: string[] = [];

        if (updates.name !== undefined) {
            fields.push("name = $[name]");
        }

        if (updates.whitelisted !== undefined) {
            fields.push("whitelisted = $[whitelisted]");
        }

        if (updates.blacklisted !== undefined) {
            fields.push("blacklisted = $[blacklisted]");
        }

        if (updates.rating !== undefined) {
            fields.push("rating = $[rating]");
        }

        if (fields.length === 0) {
            throw new Error("No valid investor fields provided for update");
        }

        const query = `
            UPDATE investors
            SET
                ${fields.join(", ")},
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.one<Investor>(query, { id, ...updates });
    }
}