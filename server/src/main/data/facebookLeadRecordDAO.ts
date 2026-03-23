// TICKET-143: Facebook lead records DAO
import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { FacebookLeadRecord } from '../types/facebookTypes';

@injectable()
export default class FacebookLeadRecordDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async upsert(record: Omit<FacebookLeadRecord, 'id' | 'synced_at'>): Promise<void> {
        await this.db.none(`
            INSERT INTO facebook_lead_records (
                fb_lead_id, fb_form_id, fb_form_name, fb_page_id,
                fb_ad_id, fb_ad_name, fb_adset_id, fb_adset_name,
                fb_campaign_id, fb_campaign_name,
                phone, phone_normalized, email, field_data,
                source_id, automator_campaign_id, automator_lead_id,
                match_status, fb_created_time
            ) VALUES (
                $[fb_lead_id], $[fb_form_id], $[fb_form_name], $[fb_page_id],
                $[fb_ad_id], $[fb_ad_name], $[fb_adset_id], $[fb_adset_name],
                $[fb_campaign_id], $[fb_campaign_name],
                $[phone], $[phone_normalized], $[email], $[field_data],
                $[source_id], $[automator_campaign_id], $[automator_lead_id],
                $[match_status], $[fb_created_time]
            )
            ON CONFLICT (fb_lead_id) DO UPDATE SET
                fb_form_name     = EXCLUDED.fb_form_name,
                fb_ad_name       = EXCLUDED.fb_ad_name,
                fb_adset_name    = EXCLUDED.fb_adset_name,
                fb_campaign_name = EXCLUDED.fb_campaign_name,
                field_data       = EXCLUDED.field_data,
                synced_at        = NOW()
        `, {
            ...record,
            field_data: JSON.stringify(record.field_data),
        });
    }

    async setMatchResult(
        id: string,
        matchStatus: 'matched' | 'unmatched',
        automatorLeadId: string | null
    ): Promise<void> {
        await this.db.none(`
            UPDATE facebook_lead_records
            SET match_status = $[matchStatus], automator_lead_id = $[automatorLeadId]
            WHERE id = $[id]
        `, { id, matchStatus, automatorLeadId });
    }

    async getPendingRecords(): Promise<FacebookLeadRecord[]> {
        return this.db.manyOrNone<FacebookLeadRecord>(`
            SELECT * FROM facebook_lead_records WHERE match_status = 'pending'
            ORDER BY fb_created_time DESC NULLS LAST
            LIMIT 1000
        `);
    }

    async getRecords(filters: {
        source_id?: string;
        match_status?: string;
        fb_form_id?: string;
        page: number;
        limit: number;
    }): Promise<{ items: (FacebookLeadRecord & { source_name: string | null })[]; count: number }> {
        const conditions: string[] = [];
        const params: Record<string, unknown> = {
            limit: filters.limit,
            offset: (filters.page - 1) * filters.limit,
        };

        if (filters.source_id)   { conditions.push('flr.source_id = $[source_id]'); params.source_id = filters.source_id; }
        if (filters.match_status) { conditions.push('flr.match_status = $[match_status]'); params.match_status = filters.match_status; }
        if (filters.fb_form_id)  { conditions.push('flr.fb_form_id = $[fb_form_id]'); params.fb_form_id = filters.fb_form_id; }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [items, countRow] = await Promise.all([
            this.db.manyOrNone<FacebookLeadRecord & { source_name: string | null }>(`
                SELECT flr.*, s.name AS source_name
                FROM facebook_lead_records flr
                LEFT JOIN sources s ON s.id = flr.source_id
                ${where}
                ORDER BY flr.fb_created_time DESC NULLS LAST, flr.synced_at DESC
                LIMIT $[limit] OFFSET $[offset]
            `, params),
            this.db.one<{ count: string }>(`
                SELECT COUNT(*) FROM facebook_lead_records flr ${where}
            `, params),
        ]);

        return { items, count: parseInt(countRow.count, 10) };
    }
}
