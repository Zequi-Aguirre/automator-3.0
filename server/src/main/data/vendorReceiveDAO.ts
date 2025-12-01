import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";

@injectable()
export default class VendorReceiveDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async create(payload: Record<string, any>) {
        const query = `
            INSERT INTO vendor_receives (payload)
            VALUES ($[payload]::jsonb)
            RETURNING *;
        `;
        return await this.db.one(query, { payload });
    }
}