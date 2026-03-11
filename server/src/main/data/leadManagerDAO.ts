import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { LeadManager, LeadManagerCreateDTO, LeadManagerUpdateDTO, LeadManagerFilters } from "../types/leadManagerTypes";

@injectable()
export default class LeadManagerDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getById(id: string): Promise<LeadManager | null> {
        const query = `
            SELECT * FROM lead_managers
            WHERE id = $[id] AND deleted IS NULL;
        `;
        return this.db.oneOrNone<LeadManager>(query, { id });
    }

    async getAll(filters: LeadManagerFilters): Promise<{ items: LeadManager[]; count: number }> {
        const { page, limit, search, includeInactive } = filters;
        const offset = (page - 1) * limit;

        const conditions: string[] = ['deleted IS NULL'];
        const params: any = { limit, offset };

        if (!includeInactive) {
            conditions.push('active = true');
        }
        if (search) {
            conditions.push(`(name ILIKE $\{search} OR email ILIKE $\{search})`);
            params.search = `%${search}%`;
        }

        const where = `WHERE ${conditions.join(' AND ')}`;

        const items = await this.db.manyOrNone<LeadManager>(`
            SELECT * FROM lead_managers
            ${where}
            ORDER BY name ASC
            LIMIT $\{limit} OFFSET $\{offset};
        `, params) || [];

        const { total } = await this.db.one<{ total: number }>(`
            SELECT COUNT(*)::int AS total FROM lead_managers ${where};
        `, params);

        return { items, count: total };
    }

    async getActive(): Promise<LeadManager[]> {
        return this.db.manyOrNone<LeadManager>(`
            SELECT * FROM lead_managers
            WHERE active = true AND deleted IS NULL
            ORDER BY name ASC;
        `) || [];
    }

    async create(data: LeadManagerCreateDTO): Promise<LeadManager> {
        const query = `
            INSERT INTO lead_managers (name, email, phone, notes)
            VALUES ($[name], $[email], $[phone], $[notes])
            RETURNING *;
        `;
        return this.db.one<LeadManager>(query, {
            name: data.name,
            email: data.email ?? null,
            phone: data.phone ?? null,
            notes: data.notes ?? null
        });
    }

    async update(id: string, data: LeadManagerUpdateDTO): Promise<LeadManager> {
        const query = `
            UPDATE lead_managers
            SET
                name    = COALESCE($[name], name),
                email   = COALESCE($[email], email),
                phone   = COALESCE($[phone], phone),
                active  = COALESCE($[active], active),
                notes   = COALESCE($[notes], notes)
            WHERE id = $[id] AND deleted IS NULL
            RETURNING *;
        `;
        return this.db.one<LeadManager>(query, { id, ...data });
    }

    async trash(id: string): Promise<LeadManager> {
        const query = `
            UPDATE lead_managers
            SET deleted = NOW()
            WHERE id = $[id] AND deleted IS NULL
            RETURNING *;
        `;
        return this.db.one<LeadManager>(query, { id });
    }
}
