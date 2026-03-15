import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { DBContainer } from "../config/DBContainer";
import { IClient } from "pg-promise/typescript/pg-subset";
import { County, CountyBuyerFilterMode } from "../types/countyTypes.ts";

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
        zip_codes?: string[] | null; // TICKET-047: ZIP codes array
    }): Promise<County> {
        const query = `
            INSERT INTO counties (name, state, population, timezone, zip_codes)
            VALUES (
                       INITCAP(LOWER($[name])),
                       $[state],
                       $[population],
                       $[timezone],
                       $[zip_codes]
                   )
                RETURNING *;
        `;
        return await this.db.one<County>(query, data);
    }

    async getById(id: string): Promise<County | null> {
        const query = `
            SELECT *
            FROM counties
            WHERE id = $1
            AND deleted IS NULL;
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
        if (status === "active") {
            statusClause = "AND blacklisted = FALSE";
        }
        if (status === "blacklisted") {
            statusClause = "AND blacklisted = TRUE";
        }

        const countiesQuery = `
            SELECT *
            FROM counties
            WHERE deleted IS NULL
            ${searchClause}
            ${statusClause}
            ORDER BY modified DESC
            LIMIT $1 OFFSET $2;
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM counties
            WHERE deleted IS NULL
            ${searchClause}
            ${statusClause};
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

    async updateCounty(
        id: string,
        updates: Partial<Pick<County, "name" | "state" | "population" | "timezone" | "blacklisted" | "whitelisted" | "zip_codes">>
    ): Promise<County> {
        const fields: string[] = [];

        if (updates.name !== undefined) {
            fields.push("name = $[name]");
        }

        if (updates.state !== undefined) {
            fields.push("state = $[state]");
        }

        if (updates.population !== undefined) {
            fields.push("population = $[population]");
        }

        if (updates.timezone !== undefined) {
            fields.push("timezone = $[timezone]");
        }

        if (updates.blacklisted !== undefined) {
            fields.push("blacklisted = $[blacklisted]");
        }

        if (updates.whitelisted !== undefined) {
            fields.push("whitelisted = $[whitelisted]");
        }

        // TICKET-047: Support zip_codes updates
        if (updates.zip_codes !== undefined) {
            fields.push("zip_codes = $[zip_codes]");
        }

        if (fields.length === 0) {
            throw new Error("No valid county fields provided for update");
        }

        const query = `
            UPDATE counties
            SET
                ${fields.join(", ")},
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.one<County>(query, { id, ...updates });
    }

    async getManyByIds(ids: string[]): Promise<County[]> {
        if (ids.length === 0) return [];
        const query = `
            SELECT *
            FROM counties
            WHERE id IN ($[ids:csv]) AND deleted IS NULL;
        `;
        return this.db.any<County>(query, { ids });
    }

    async updateBuyerFilter(id: string, mode: CountyBuyerFilterMode | null, buyerIds: string[]): Promise<County> {
        const query = `
            UPDATE counties
            SET
                buyer_filter_mode = $[mode],
                buyer_filter_buyer_ids = $[buyerIds]::uuid[],
                modified = NOW()
            WHERE id = $[id]
                AND deleted IS NULL
            RETURNING *;
        `;
        return await this.db.one<County>(query, { id, mode, buyerIds });
    }

    /**
     * TICKET-047: Lookup county by zip code
     * Uses the zip_codes array for deterministic county lookup
     *
     * @param zipCode - 5-digit zip code
     * @returns County if found, null otherwise
     */
    async getByZipCode(zipCode: string): Promise<County | null> {
        const query = `
            SELECT *
            FROM counties
            WHERE deleted IS NULL
                AND zip_codes IS NOT NULL
                AND $[zipCode] = ANY(zip_codes)
            LIMIT 1;
        `;

        return await this.db.oneOrNone<County>(query, { zipCode });
    }
}