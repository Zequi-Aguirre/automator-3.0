import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { Buyer } from "../types/buyerTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

@injectable()
export default class BuyerDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    // Fetch a single buyer by ID
    async getOneById(id: string): Promise<Buyer | null> {
        const query = `
            SELECT *
            FROM buyers
            WHERE id = $(id)
            AND deleted IS NULL;
        `;

        return await this.db.oneOrNone<Buyer>(query, { id });
    }

    // Create a new buyer
    async createBuyer(buyerData: Omit<Buyer, 'id' | 'created' | 'modified'>): Promise<Buyer> {
        const query = `
            INSERT INTO buyers (
                name,
                url,
            ) VALUES (
                $(name),
                $(url),
            )
            RETURNING *;
        `;

        return await this.db.one<Buyer>(query, buyerData);
    }

    // Get all buyers
    async getAll(limit: number = 50, offset: number = 0): Promise<Buyer[]> {
        const query = `
            SELECT *
            FROM buyers
            WHERE deleted IS NULL
            ORDER BY created DESC
            LIMIT $(limit) OFFSET $(offset);
        `;

        return await this.db.manyOrNone<Buyer>(query, { limit, offset });
    }

    // Get all active buyers
    async getAllMocked(limit: number = 50, offset: number = 0): Promise<Buyer[]> {
        const query = `
            SELECT *
            FROM buyers
            WHERE is_mock = true
            AND deleted IS NULL
            ORDER BY created DESC
            LIMIT $(limit) OFFSET $(offset);
        `;

        return await this.db.manyOrNone<Buyer>(query, { limit, offset });
    }

    // Delete a buyer by ID (soft delete)
    async deleteBuyer(id: string): Promise<void> {
        const query = `
            UPDATE buyers
            SET 
                deleted = now()
            WHERE id = $(id);
        `;

        await this.db.none(query, { id });
    }
}