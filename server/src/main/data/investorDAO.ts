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

    async getById(id: string): Promise<Investor | null> {
        const query = `
            SELECT * 
            FROM investors 
            WHERE id = $[id] AND deleted IS NULL;
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
}