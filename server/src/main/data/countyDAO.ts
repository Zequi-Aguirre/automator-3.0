import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { IClient } from "pg-promise/typescript/pg-subset";
import { County } from "../types/countyTypes.ts";

@injectable()
export default class CountyDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async insertCounty(data: {
        name: string;
        state: string;
        population?: number | null;
        timezone?: string | null;
    }): Promise<County> {
        const query = `
            INSERT INTO counties (name, state, population, timezone)
            VALUES ($[name], $[state], $[population], $[timezone])
            RETURNING *;
          `;
        return await this.db.one<County>(query, data);
    }

    async getById(id: string): Promise<County | null> {
        const query = `
        SELECT *
        FROM counties
        WHERE id = $1 AND deleted IS NULL
    `;
        return await this.db.oneOrNone<County>(query, [id]);
    }

    async getMany(filters: {
        page: number;
        limit: number;
        search?: string;
        status?: "all" | "active" | "blacklisted";
    }): Promise<{ counties: County[]; count: number }> {

        const { page, limit, search = "", status = "all" } = filters;
        const offset = (page - 1) * limit;

        const nameFilter = search.trim().toLowerCase();
        const searchClause = nameFilter
            ? `AND LOWER(name) LIKE '%${nameFilter}%'`
            : "";

        let statusClause = "";
        if (status === "active") statusClause = `AND blacklisted = FALSE`;
        if (status === "blacklisted") statusClause = `AND blacklisted = TRUE`;

        const countiesQuery = `
            SELECT *
            FROM counties
            WHERE deleted IS NULL
            ${searchClause}
            ${statusClause}
            ORDER BY modified DESC
            LIMIT $1 OFFSET $2
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM counties
            WHERE deleted IS NULL
            ${searchClause}
            ${statusClause}
        `;

        const counties = await this.db.manyOrNone<County>(countiesQuery, [limit, offset]);
        const { total } = await this.db.one<{ total: number }>(countQuery);

        return { counties, count: total };
    }

    async getAllCounties(): Promise<County[]> {
        const query = `
            SELECT * 
            FROM counties 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<County[]>(query);
    }

    async updateCountyBlacklistStatus(id: string, blacklisted: boolean): Promise<County> {
        const query = `
        UPDATE counties
        SET blacklisted = $[blacklisted],
            modified = NOW()
        WHERE id = $[id]
        RETURNING *;
    `;
        return await this.db.one<County>(query, { id, blacklisted });
    }

}