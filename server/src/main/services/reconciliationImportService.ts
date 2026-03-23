import { injectable } from 'tsyringe';
import * as XLSX from 'xlsx';
import PlatformImportBatchDAO from '../data/platformImportBatchDAO';
import PlatformLeadRecordDAO from '../data/platformLeadRecordDAO';
import PlatformBuyerMappingDAO from '../data/platformBuyerMappingDAO';
import ReconciliationMatchingService from './reconciliationMatchingService';
import { ImportResult, ParsedPlatformRow, Platform } from '../types/reconciliationTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeHeader(raw: string): string {
    return raw
        .replace(/^[A-Za-z\s]+[\s\-|]+/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function parseArrayField(val: unknown): string[] {
    if (!val) return [];
    const s = String(val).trim();
    // PostgreSQL array: {sellers direct, clients direct}
    if (s.startsWith('{') && s.endsWith('}')) {
        return s.slice(1, -1).split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    // JSON array
    try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch { /* not JSON */ }
    // Plain comma-separated string from array_to_string (e.g. "sellers direct, clients direct")
    if (s.includes(',')) {
        return s.split(',').map(v => v.trim()).filter(Boolean);
    }
    return s ? [s] : [];
}

function parseBool(val: unknown): boolean | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'boolean') return val;
    const s = String(val).toLowerCase().trim();
    if (s === 't' || s === 'true' || s === '1') return true;
    if (s === 'f' || s === 'false' || s === '0') return false;
    return null;
}

function parseTimestamp(val: unknown): string | null {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString();
    const s = String(val).trim();
    return s || null;
}

function normalizePhone(digits: string | null | undefined): string | null {
    if (!digits) return null;
    const d = String(digits).replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) return d.slice(1);
    if (d.length === 10) return d;
    return d || null;
}

function parsePrice(val: unknown): number | null {
    if (val === null || val === undefined || val === '') return null;
    const n = parseFloat(String(val));
    return isNaN(n) ? null : Math.round(n * 100);
}

function derivePlatform(products: string[]): Platform {
    for (const p of products) {
        const s = p.toLowerCase();
        if (s.includes('compass')) return 'compass';
        if (s.includes('pickle')) return 'pickle';
        if (s.includes('seller')) return 'sellers';
    }
    return 'sellers';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@injectable()
export default class ReconciliationImportService {
    constructor(
        private readonly batchDAO: PlatformImportBatchDAO,
        private readonly recordDAO: PlatformLeadRecordDAO,
        private readonly mappingDAO: PlatformBuyerMappingDAO,
        private readonly matchingService: ReconciliationMatchingService
    ) {}

    async importFile(
        buffer: Buffer,
        filename: string,
        automatorBuyerId: string,
        userId: string
    ): Promise<ImportResult> {
        const rows = this.parseFile(buffer, automatorBuyerId);

        if (rows.length === 0) {
            throw new Error('No valid rows found in file');
        }

        // Derive platform from the first row that has buyer_products
        const platform = derivePlatform(rows.flatMap(r => r.platform_buyer_products));

        const batch = await this.batchDAO.insert({
            platform,
            filename,
            row_count: rows.length,
            imported_by: userId,
        });

        await this.recordDAO.bulkUpsert(rows, batch.id);

        // Persist platform buyer → automator buyer mappings for audit/matching engine
        const seen = new Set<string>();
        for (const row of rows) {
            if (!row.platform_buyer_id || seen.has(row.platform_buyer_id)) continue;
            seen.add(row.platform_buyer_id);
            await this.mappingDAO.upsert({
                platform,
                platform_buyer_id: row.platform_buyer_id,
                platform_buyer_name: row.platform_buyer_name,
                automator_buyer_id: automatorBuyerId,
                mapped_by: userId,
            });
        }

        console.info('Reconciliation import complete', {
            platform,
            batch_id: batch.id,
            row_count: rows.length,
        });

        // Auto-run matching for the newly imported batch
        this.matchingService.runMatching(batch.id, userId).catch(err => {
            console.error('Reconciliation matching failed after import', err);
        });

        return { batch_id: batch.id, row_count: rows.length };
    }

    async getLastBatchesPerPlatform(): Promise<ReturnType<PlatformImportBatchDAO['getLastPerPlatform']>> {
        return await this.batchDAO.getLastPerPlatform();
    }

    // -------------------------------------------------------------------------
    // Private: parse CSV/XLSX buffer into ParsedPlatformRow[]
    // -------------------------------------------------------------------------

    private parseFile(buffer: Buffer, automatorBuyerId: string): ParsedPlatformRow[] {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

        const results: ParsedPlatformRow[] = [];

        for (const raw of rawRows) {
            const row: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(raw)) {
                row[normalizeHeader(key)] = val;
            }

            const buyerLeadId = row['northstar_buyer_lead_id'];
            if (!buyerLeadId) continue;

            const disputeStatus = parseTimestamp(row['dispute_status']) ?? null;
            const phoneDigits = row['phone_digits'] ? String(row['phone_digits']) : null;
            const buyerProducts = parseArrayField(row['buyer_products']);

            results.push({
                platform:               derivePlatform(buyerProducts),
                platform_lead_id:       (row['northstar_lead_id'] as string) ?? null,
                platform_buyer_lead_id: String(buyerLeadId),
                platform_buyer_id:      (row['northstar_buyer_id'] as string) ?? null,
                platform_buyer_name:    (row['northstar_buyer_name'] as string) ?? null,
                platform_buyer_email:   (row['northstar_buyer_email'] as string) ?? null,
                platform_buyer_products: buyerProducts,
                phone:                  (row['phone'] as string) ?? null,
                phone_normalized:       normalizePhone(phoneDigits),
                email:                  (row['email'] as string) ?? null,
                campaign_name:          (row['campaign_name'] as string) ?? null,
                import_note:            (row['import_note'] as string) ?? null,
                received_at:            parseTimestamp(row['received_at']),
                sent_out_at:            parseTimestamp(row['sent_out_at']),
                buyer_lead_created_at:  parseTimestamp(row['buyer_lead_created_at']),
                buyer_lead_status:      (row['buyer_lead_status'] as string) ?? null,
                buyer_confirmed:        parseBool(row['buyer_confirmed']),
                price_cents:            parsePrice(row['price']),
                disputed:               disputeStatus !== null,
                dispute_reason:         (row['dispute_reason'] as string) ?? null,
                dispute_status:         disputeStatus,
                dispute_date:           parseTimestamp(row['dispute_date']),
                disputed_at:            parseTimestamp(row['disputed_at']),
                automator_buyer_id:     automatorBuyerId,
            });
        }

        return results;
    }
}
