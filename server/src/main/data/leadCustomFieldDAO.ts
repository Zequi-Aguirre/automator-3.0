// TICKET-152: Lead Custom Fields DAO
import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { LeadCustomField, LeadCustomFieldCreateDTO, LeadCustomFieldUpdateDTO } from '../types/leadCustomFieldTypes';

@injectable()
export default class LeadCustomFieldDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    // All fields including inactive — for admin management view
    async getAll(): Promise<LeadCustomField[]> {
        return this.db.manyOrNone<LeadCustomField>(`
            SELECT * FROM lead_custom_fields
            ORDER BY sort_order ASC, created_at ASC;
        `) ?? [];
    }

    // Active fields only — for intake validation and form rendering
    async getAllActive(): Promise<LeadCustomField[]> {
        return this.db.manyOrNone<LeadCustomField>(`
            SELECT * FROM lead_custom_fields
            WHERE active = true
            ORDER BY sort_order ASC, created_at ASC;
        `) ?? [];
    }

    // Look up definitions for a set of keys — used when rendering a lead's custom fields
    async getByKeys(keys: string[]): Promise<LeadCustomField[]> {
        if (keys.length === 0) return [];
        return this.db.manyOrNone<LeadCustomField>(`
            SELECT * FROM lead_custom_fields
            WHERE key = ANY($1::text[])
            ORDER BY sort_order ASC, created_at ASC;
        `, [keys]) ?? [];
    }

    async getByKey(key: string): Promise<LeadCustomField | null> {
        return this.db.oneOrNone<LeadCustomField>(`
            SELECT * FROM lead_custom_fields WHERE key = $[key];
        `, { key });
    }

    async create(data: LeadCustomFieldCreateDTO): Promise<LeadCustomField> {
        return this.db.one<LeadCustomField>(`
            INSERT INTO lead_custom_fields
                (key, label, description, field_type, options, required, sort_order)
            VALUES
                ($[key], $[label], $[description], $[field_type], $[options], $[required], $[sort_order])
            RETURNING *;
        `, {
            key: data.key,
            label: data.label,
            description: data.description ?? null,
            field_type: data.field_type ?? 'text',
            options: data.options ? JSON.stringify(data.options) : null,
            required: data.required ?? false,
            sort_order: data.sort_order ?? 50,
        });
    }

    async update(id: string, data: LeadCustomFieldUpdateDTO): Promise<LeadCustomField> {
        const fields: string[] = [];
        const params: Record<string, unknown> = { id };

        if (data.label !== undefined) { fields.push('label = $[label]'); params.label = data.label; }
        if (data.description !== undefined) { fields.push('description = $[description]'); params.description = data.description; }
        if (data.field_type !== undefined) { fields.push('field_type = $[field_type]'); params.field_type = data.field_type; }
        if (data.options !== undefined) { fields.push('options = $[options]'); params.options = data.options ? JSON.stringify(data.options) : null; }
        if (data.required !== undefined) { fields.push('required = $[required]'); params.required = data.required; }
        if (data.active !== undefined) { fields.push('active = $[active]'); params.active = data.active; }
        if (data.sort_order !== undefined) { fields.push('sort_order = $[sort_order]'); params.sort_order = data.sort_order; }

        if (fields.length === 0) {
            return this.db.one<LeadCustomField>('SELECT * FROM lead_custom_fields WHERE id = $[id];', { id });
        }

        fields.push('updated_at = NOW()');

        return this.db.one<LeadCustomField>(`
            UPDATE lead_custom_fields
            SET ${fields.join(', ')}
            WHERE id = $[id]
            RETURNING *;
        `, params);
    }

    // Used by intake auto-discovery: creates a field definition if the key is unknown.
    // No-op if the key already exists.
    async upsertAutoDiscovered(key: string): Promise<void> {
        const label = key
            .split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

        await this.db.none(`
            INSERT INTO lead_custom_fields (key, label, field_type, auto_discovered)
            VALUES ($[key], $[label], 'text', true)
            ON CONFLICT (key) DO NOTHING;
        `, { key, label });
    }

    async getAutoDiscoveredCount(): Promise<number> {
        const result = await this.db.one<{ count: string }>(`
            SELECT COUNT(*) FROM lead_custom_fields
            WHERE auto_discovered = true AND active = true;
        `);
        return parseInt(result.count, 10);
    }
}
