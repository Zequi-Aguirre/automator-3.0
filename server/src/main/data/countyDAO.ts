import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { IClient } from "pg-promise/typescript/pg-subset";
import { County } from "../types/countyType.ts";

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

    async getAllCounties(): Promise<County[]> {
        const query = `
            SELECT * 
            FROM counties 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<County[]>(query);
    }

}