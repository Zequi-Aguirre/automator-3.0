import { injectable } from 'tsyringe';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import { ParsedPlatformRow, PlatformLeadRecord } from '../types/reconciliationTypes';

@injectable()
export default class PlatformLeadRecordDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getPendingRecords(batchId?: string): Promise<PlatformLeadRecord[]> {
        const where = batchId != null
            ? `WHERE match_status = 'pending' AND import_batch_id = $[batchId]`
            : `WHERE match_status = 'pending'`;
        return await this.db.manyOrNone<PlatformLeadRecord>(
            `SELECT * FROM platform_lead_records ${where}`,
            { batchId }
        );
    }

    async setMatchResult(
        id: string,
        matchStatus: 'matched' | 'unmatched' | 'ambiguous',
        automatorLeadId: string | null,
        automatorSendLogId: string | null
    ): Promise<void> {
        await this.db.none(
            `UPDATE platform_lead_records
             SET match_status          = $[matchStatus],
                 automator_lead_id     = $[automatorLeadId],
                 automator_send_log_id = $[automatorSendLogId]
             WHERE id = $[id]`,
            { id, matchStatus, automatorLeadId, automatorSendLogId }
        );
    }

    async bulkUpsert(rows: ParsedPlatformRow[], batchId: string): Promise<void> {
        if (rows.length === 0) return;

        await this.db.task(async t => {
            for (const row of rows) {
                await t.none(
                    `INSERT INTO platform_lead_records (
                        import_batch_id, platform,
                        platform_lead_id, platform_buyer_lead_id, platform_buyer_id,
                        platform_buyer_name, platform_buyer_email, platform_buyer_products,
                        phone, phone_normalized, email,
                        campaign_name, import_note,
                        received_at, sent_out_at, buyer_lead_created_at,
                        buyer_lead_status, buyer_confirmed, price_cents,
                        disputed, dispute_reason, dispute_status, dispute_date, disputed_at,
                        automator_buyer_id
                    ) VALUES (
                        $[import_batch_id], $[platform],
                        $[platform_lead_id], $[platform_buyer_lead_id], $[platform_buyer_id],
                        $[platform_buyer_name], $[platform_buyer_email], $[platform_buyer_products],
                        $[phone], $[phone_normalized], $[email],
                        $[campaign_name], $[import_note],
                        $[received_at], $[sent_out_at], $[buyer_lead_created_at],
                        $[buyer_lead_status], $[buyer_confirmed], $[price_cents],
                        $[disputed], $[dispute_reason], $[dispute_status], $[dispute_date], $[disputed_at],
                        $[automator_buyer_id]
                    )
                    ON CONFLICT (platform, platform_buyer_lead_id) DO UPDATE SET
                        buyer_lead_status     = EXCLUDED.buyer_lead_status,
                        buyer_confirmed       = EXCLUDED.buyer_confirmed,
                        price_cents           = EXCLUDED.price_cents,
                        sent_out_at           = EXCLUDED.sent_out_at,
                        disputed              = EXCLUDED.disputed,
                        dispute_reason        = EXCLUDED.dispute_reason,
                        dispute_status        = EXCLUDED.dispute_status,
                        dispute_date          = EXCLUDED.dispute_date,
                        disputed_at           = EXCLUDED.disputed_at,
                        platform_buyer_name   = EXCLUDED.platform_buyer_name,
                        platform_buyer_email  = EXCLUDED.platform_buyer_email,
                        platform_buyer_products = EXCLUDED.platform_buyer_products,
                        automator_buyer_id    = COALESCE(EXCLUDED.automator_buyer_id, platform_lead_records.automator_buyer_id),
                        last_imported_at      = NOW()`,
                    { ...row, import_batch_id: batchId }
                );
            }
        });
    }
}
