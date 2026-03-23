import { injectable } from 'tsyringe';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import PlatformImportBatchDAO from '../data/platformImportBatchDAO';
import PlatformLeadRecordDAO from '../data/platformLeadRecordDAO';
import PlatformBuyerMappingDAO from '../data/platformBuyerMappingDAO';
import {
    BuyerMapping,
    ImportResult,
    ParsedPlatformRow,
    Platform,
    PlatformBuyerSummary,
    PreviewResult,
} from '../types/reconciliationTypes';

// ---------------------------------------------------------------------------
// Temp file store — holds parsed rows between preview and confirm calls.
// Entries expire after 30 minutes.
// ---------------------------------------------------------------------------

type TempEntry = {
    platform: Platform;
    filename: string;
    rows: ParsedPlatformRow[];
    expiresAt: number;
};

const tempStore = new Map<string, TempEntry>();

setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of tempStore.entries()) {
        if (entry.expiresAt < now) tempStore.delete(token);
    }
}, 5 * 60 * 1000);

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
    if (s.startsWith('{') && s.endsWith('}')) {
        return s.slice(1, -1).split(',').map(v => v.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch { /* not JSON */ }
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@injectable()
export default class ReconciliationImportService {
    constructor(
        private readonly batchDAO: PlatformImportBatchDAO,
        private readonly recordDAO: PlatformLeadRecordDAO,
        private readonly mappingDAO: PlatformBuyerMappingDAO
    ) {}

    async previewFile(
        platform: Platform,
        buffer: Buffer,
        filename: string
    ): Promise<PreviewResult> {
        const rows = this.parseFile(buffer, platform);

        if (rows.length === 0) {
            throw new Error('No valid rows found in file');
        }

        // Load saved buyer mappings for this platform so we can pre-fill dropdowns
        const savedMappings = await this.mappingDAO.getByPlatform(platform);
        const savedMap = new Map(savedMappings.map(m => [m.platform_buyer_id, m.automator_buyer_id]));

        // Collect unique platform buyers
        const buyerMap = new Map<string, PlatformBuyerSummary>();
        for (const row of rows) {
            if (!row.platform_buyer_id) continue;
            if (!buyerMap.has(row.platform_buyer_id)) {
                buyerMap.set(row.platform_buyer_id, {
                    platform_buyer_id: row.platform_buyer_id,
                    platform_buyer_name: row.platform_buyer_name,
                    platform_buyer_email: row.platform_buyer_email,
                    platform_buyer_products: row.platform_buyer_products,
                    row_count: 0,
                    saved_automator_buyer_id: savedMap.get(row.platform_buyer_id) ?? null,
                });
            }
            buyerMap.get(row.platform_buyer_id)!.row_count++;
        }

        const fileToken = uuidv4();
        tempStore.set(fileToken, {
            platform,
            filename,
            rows,
            expiresAt: Date.now() + 30 * 60 * 1000,
        });

        return {
            row_count: rows.length,
            platform_buyers: Array.from(buyerMap.values()),
            file_token: fileToken,
        };
    }

    async confirmImport(
        fileToken: string,
        buyerMappings: BuyerMapping[],
        userId: string
    ): Promise<ImportResult> {
        const entry = tempStore.get(fileToken);
        if (!entry) throw new Error('Import session expired or not found — please re-upload the file');

        tempStore.delete(fileToken);

        const { platform, filename, rows } = entry;
        const mappingLookup = new Map(buyerMappings.map(m => [m.platform_buyer_id, m.automator_buyer_id]));

        // Apply buyer mappings to rows
        const mappedRows = rows.map(row => ({
            ...row,
            automator_buyer_id: row.platform_buyer_id
                ? (mappingLookup.get(row.platform_buyer_id) ?? row.automator_buyer_id)
                : row.automator_buyer_id,
        }));

        const batch = await this.batchDAO.insert({
            platform,
            filename,
            row_count: mappedRows.length,
            imported_by: userId,
        });

        await this.recordDAO.bulkUpsert(mappedRows, batch.id);

        // Persist buyer mappings for future imports
        for (const mapping of buyerMappings) {
            const summary = entry.rows.find(r => r.platform_buyer_id === mapping.platform_buyer_id);
            await this.mappingDAO.upsert({
                platform,
                platform_buyer_id: mapping.platform_buyer_id,
                platform_buyer_name: summary?.platform_buyer_name ?? null,
                automator_buyer_id: mapping.automator_buyer_id,
                mapped_by: userId,
            });
        }

        console.info('Reconciliation import complete', {
            platform,
            batch_id: batch.id,
            row_count: mappedRows.length,
        });

        return { batch_id: batch.id, row_count: mappedRows.length };
    }

    async getLastBatchesPerPlatform(): Promise<ReturnType<PlatformImportBatchDAO['getLastPerPlatform']>> {
        return await this.batchDAO.getLastPerPlatform();
    }

    // -------------------------------------------------------------------------
    // Private: parse CSV/XLSX buffer into ParsedPlatformRow[]
    // -------------------------------------------------------------------------

    private parseFile(buffer: Buffer, platform: Platform): ParsedPlatformRow[] {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

        const results: ParsedPlatformRow[] = [];

        for (const raw of rawRows) {
            // Normalize headers
            const row: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(raw)) {
                row[normalizeHeader(key)] = val;
            }

            const buyerLeadId = row['northstar_buyer_lead_id'];
            if (!buyerLeadId) continue; // skip rows without the upsert key

            const disputeStatus = parseTimestamp(row['dispute_status']) ?? null;

            const phoneDigits = row['phone_digits'] ? String(row['phone_digits']) : null;

            results.push({
                platform,
                platform_lead_id:       (row['northstar_lead_id'] as string) ?? null,
                platform_buyer_lead_id: String(buyerLeadId),
                platform_buyer_id:      (row['northstar_buyer_id'] as string) ?? null,
                platform_buyer_name:    (row['northstar_buyer_name'] as string) ?? null,
                platform_buyer_email:   (row['northstar_buyer_email'] as string) ?? null,
                platform_buyer_products: parseArrayField(row['buyer_products']),
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
                automator_buyer_id:     null, // set during confirmImport
            });
        }

        return results;
    }
}
