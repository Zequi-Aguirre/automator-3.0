// TICKET-141: platformSync job — queries each buyer's Northstar DB directly,
// upserts rows into platform_lead_records, then triggers the matching engine.

import { injectable } from 'tsyringe';
import { Client } from 'pg';
import PlatformConnectionService from '../../services/platformConnectionService';
import PlatformImportBatchDAO from '../../data/platformImportBatchDAO';
import PlatformLeadRecordDAO from '../../data/platformLeadRecordDAO';
import ReconciliationMatchingService from '../../services/reconciliationMatchingService';
import { ParsedPlatformRow, Platform } from '../../types/reconciliationTypes';

// ---------------------------------------------------------------------------
// Northstar sync query — identical to the Metabase reconciliation query,
// parameterized by northstar_buyer_id ($1) and lookback_days ($2).
// ---------------------------------------------------------------------------
const NORTHSTAR_SYNC_QUERY = `
    SELECT
        l.id                              AS northstar_lead_id,
        l.phone,
        l.email,
        REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g') AS phone_digits,
        l.created                         AS received_at,
        cam.product                       AS platform,
        cam.name                          AS campaign_name,
        la.note                           AS import_note,
        bl.id                             AS northstar_buyer_lead_id,
        bl.sent_date                      AS sent_out_at,
        bl.status                         AS buyer_lead_status,
        bl.buyer_confirmed,
        bl.price,
        bl.created                        AS buyer_lead_created_at,
        u.id                              AS northstar_buyer_id,
        u.name                            AS northstar_buyer_name,
        u.email                           AS northstar_buyer_email,
        array_to_string(u.products, ', ') AS buyer_products,
        d.id                              AS dispute_id,
        d.dispute_date,
        d.dispute_reason,
        d.status                          AS dispute_status,
        d.created                         AS disputed_at
    FROM leads l
    JOIN buyer_leads bl      ON bl.lead_id = l.id      AND bl.deleted IS NULL
    JOIN users u             ON u.id = bl.user_id
    LEFT JOIN campaigns cam  ON cam.id = l.campaign_id AND cam.deleted IS NULL
    LEFT JOIN disputes d     ON d.buyer_lead_id = bl.id AND d.deleted IS NULL
    LEFT JOIN LATERAL (
        SELECT note FROM lead_activities
        WHERE lead_id = l.id
          AND reason = 'imported'
          AND deleted IS NULL
        ORDER BY created ASC
        LIMIT 1
    ) la ON true
    WHERE l.deleted IS NULL
      AND u.id = $1
      AND l.created >= NOW() - ($2 * INTERVAL '1 day')
    ORDER BY l.created DESC
`;

// ---------------------------------------------------------------------------
// Helpers (same logic as reconciliationImportService)
// ---------------------------------------------------------------------------

function normalizePhone(digits: string | null | undefined): string | null {
    if (!digits) return null;
    const d = String(digits).replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) return d.slice(1);
    if (d.length === 10) return d;
    return d || null;
}

function derivePlatform(product: string | null, buyerProducts: string): Platform {
    const check = (s: string): Platform | null => {
        const lower = s.toLowerCase();
        if (lower.includes('compass')) return 'compass';
        if (lower.includes('pickle')) return 'pickle';
        if (lower.includes('seller') || lower.includes('client')) return 'sellers';
        return null;
    };
    if (product) {
        const p = check(product);
        if (p) return p;
    }
    for (const part of buyerProducts.split(',')) {
        const p = check(part.trim());
        if (p) return p;
    }
    return 'sellers';
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

type ActiveConnection = {
    id: string;
    automator_buyer_id: string;
    buyer_name: string;
    northstar_buyer_id: string;
    host: string;
    port: number;
    dbname: string;
    db_username: string;
    password: string;
    lookback_days: number;
};

@injectable()
export default class PlatformSyncJob {
    constructor(
        private readonly connectionService: PlatformConnectionService,
        private readonly batchDAO: PlatformImportBatchDAO,
        private readonly recordDAO: PlatformLeadRecordDAO,
        private readonly matchingService: ReconciliationMatchingService,
    ) {}

    async execute(): Promise<void> {
        console.log('[PlatformSyncJob] Starting...');

        const connections = await this.connectionService.getActiveConnectionsWithPasswords();
        console.log(`[PlatformSyncJob] ${connections.length} active connection(s)`);

        for (const conn of connections) {
            const buyerName = conn.buyer_name ?? conn.automator_buyer_id;
            console.log(`[PlatformSyncJob] Syncing buyer "${buyerName}" (lookback: ${conn.lookback_days}d)`);
            try {
                await this.syncConnection({ ...conn, buyer_name: buyerName });
                await this.connectionService.updateLastSynced(conn.id);
            } catch (err) {
                console.error(`[PlatformSyncJob] Failed for buyer "${buyerName}":`, err instanceof Error ? err.message : err);
            }
        }

        console.log('[PlatformSyncJob] Done.');
    }

    private async syncConnection(conn: ActiveConnection): Promise<void> {
        const client = new Client({
            host: conn.host,
            port: conn.port,
            database: conn.dbname,
            user: conn.db_username,
            password: conn.password,
            connectionTimeoutMillis: 15000,
            ssl: { rejectUnauthorized: false },
        });

        await client.connect();

        let rows: ParsedPlatformRow[];
        try {
            const result = await client.query(NORTHSTAR_SYNC_QUERY, [conn.northstar_buyer_id, conn.lookback_days]);
            rows = result.rows.map(r => this.mapRow(r, conn.automator_buyer_id));
        } finally {
            await client.end().catch(() => {});
        }

        if (rows.length === 0) {
            console.log(`[PlatformSyncJob] No rows returned for buyer "${conn.buyer_name}"`);
            return;
        }

        const platform = rows.find(r => r.platform)?.platform ?? 'sellers';

        const batch = await this.batchDAO.insert({
            platform,
            filename: null,
            row_count: rows.length,
            imported_by: null,
            sync_type: 'db_sync',
            platform_connection_id: conn.id,
        });

        await this.recordDAO.bulkUpsert(rows, batch.id);
        console.log(`[PlatformSyncJob] Upserted ${rows.length} rows for buyer "${conn.buyer_name}" (batch ${batch.id})`);

        // Run matching fire-and-forget, same as CSV import
        this.matchingService.runMatching(batch.id, null).catch(err => {
            console.error(`[PlatformSyncJob] Matching failed for batch ${batch.id}:`, err);
        });
    }

    private mapRow(r: Record<string, unknown>, automatorBuyerId: string): ParsedPlatformRow {
        const phoneDigits = r.phone_digits ? String(r.phone_digits) : null;
        const buyerProductsStr = r.buyer_products ? String(r.buyer_products) : '';
        const buyerProducts = buyerProductsStr ? buyerProductsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        const platform = derivePlatform(r.platform as string | null, buyerProductsStr);

        return {
            platform,
            platform_lead_id:        (r.northstar_lead_id as string) ?? null,
            platform_buyer_lead_id:  r.northstar_buyer_lead_id as string,
            platform_buyer_id:       (r.northstar_buyer_id as string) ?? null,
            platform_buyer_name:     (r.northstar_buyer_name as string) ?? null,
            platform_buyer_email:    (r.northstar_buyer_email as string) ?? null,
            platform_buyer_products: buyerProducts,
            phone:                   (r.phone as string) ?? null,
            phone_normalized:        normalizePhone(phoneDigits),
            email:                   (r.email as string) ?? null,
            campaign_name:           (r.campaign_name as string) ?? null,
            import_note:             (r.import_note as string) ?? null,
            received_at:             r.received_at ? (r.received_at as Date).toISOString() : null,
            sent_out_at:             r.sent_out_at ? (r.sent_out_at as Date).toISOString() : null,
            buyer_lead_created_at:   r.buyer_lead_created_at ? (r.buyer_lead_created_at as Date).toISOString() : null,
            buyer_lead_status:       (r.buyer_lead_status as string) ?? null,
            buyer_confirmed:         (r.buyer_confirmed as boolean) ?? null,
            price_cents:             r.price != null ? Math.round(parseFloat(String(r.price)) * 100) : null,
            disputed:                r.dispute_id != null,
            dispute_reason:          (r.dispute_reason as string) ?? null,
            dispute_status:          (r.dispute_status as string) ?? null,
            dispute_date:            r.dispute_date ? (r.dispute_date as Date).toISOString() : null,
            disputed_at:             r.disputed_at ? (r.disputed_at as Date).toISOString() : null,
            automator_buyer_id:      automatorBuyerId,
        };
    }
}
