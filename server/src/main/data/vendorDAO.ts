import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { Vendor } from "../types/vendorTypes";

@injectable()
export default class VendorDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<Vendor[]> {
        const query = `
            SELECT *
            FROM vendors
            ORDER BY created_at DESC;
        `;
        return await this.db.manyOrNone<Vendor>(query);
    }

    async getById(id: string): Promise<Vendor | null> {
        const query = `
            SELECT *
            FROM vendors
            WHERE id = $[id];
        `;
        return await this.db.oneOrNone<Vendor>(query, { id });
    }

    async getByName(name: string): Promise<Vendor | null> {
        const query = `
            SELECT *
            FROM vendors
            WHERE name = $[name];
        `;
        return await this.db.oneOrNone<Vendor>(query, { name });
    }

    async create(vendor: Omit<Vendor, "id" | "created_at" | "updated_at">): Promise<Vendor> {
        const query = `
            INSERT INTO vendors (name, active, weight)
            VALUES ($[name], $[active], $[weight])
            RETURNING *;
        `;
        return await this.db.one<Vendor>(query, vendor);
    }

    async update(id: string, updates: Partial<Vendor>): Promise<Vendor> {
        const query = `
            UPDATE vendors
            SET 
                name = COALESCE($[name], name),
                active = COALESCE($[active], active),
                weight = COALESCE($[weight], weight),
                updated_at = NOW()
            WHERE id = $[id]
            RETURNING *;
        `;
        return await this.db.one<Vendor>(query, { id, ...updates });
    }

    async delete(id: string): Promise<void> {
        const query = `
            DELETE FROM vendors
            WHERE id = $[id];
        `;
        await this.db.none(query, { id });
    }
}