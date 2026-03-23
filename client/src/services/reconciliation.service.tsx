// TICKET-137 — Reconciliation import service
// TICKET-142 — Records dashboard
import { authProvider, AxiosProvider } from '../config/axiosProvider';

export interface ImportResult {
    batch_id: number;
    row_count: number;
}

export interface ImportBatch {
    id: number;
    platform: string;
    filename: string | null;
    row_count: number | null;
    imported_by: string | null;
    imported_at: string;
}

export interface PlatformLeadRecord {
    id: string;
    import_batch_id: string;
    platform: string;
    platform_lead_id: string | null;
    platform_buyer_lead_id: string;
    platform_buyer_id: string | null;
    platform_buyer_name: string | null;
    phone: string | null;
    phone_normalized: string | null;
    email: string | null;
    campaign_name: string | null;
    received_at: string | null;
    sent_out_at: string | null;
    buyer_lead_status: string | null;
    buyer_confirmed: boolean | null;
    price_cents: number | null;
    disputed: boolean;
    dispute_reason: string | null;
    dispute_status: string | null;
    automator_lead_id: string | null;
    automator_buyer_id: string | null;
    buyer_name: string | null;
    match_status: string;
    created: string;
    last_imported_at: string;
}

class ReconciliationService {
    constructor(private readonly api: AxiosProvider) {}

    async importFile(automatorBuyerId: string, file: File): Promise<ImportResult> {
        const form = new FormData();
        form.append('automator_buyer_id', automatorBuyerId);
        form.append('file', file);
        const res = await this.api.getApi().post('/api/reconciliation/import', form);
        return res.data;
    }

    async getLastBatches(): Promise<ImportBatch[]> {
        const res = await this.api.getApi().get('/api/reconciliation/batches');
        return res.data;
    }

    async getRecords(params: {
        platform?: string;
        match_status?: string;
        automator_buyer_id?: string;
        disputed?: boolean;
        page: number;
        limit: number;
    }): Promise<{ items: PlatformLeadRecord[]; count: number }> {
        const res = await this.api.getApi().get('/api/reconciliation/records', { params });
        return res.data;
    }
}

export default new ReconciliationService(authProvider);
