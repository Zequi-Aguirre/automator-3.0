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

    async getAllAffiliates(): Promise<Affiliate[]> {
        const query = `
            SELECT * 
            FROM affiliates 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<Affiliate[]>(query);
    }
}