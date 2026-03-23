// TICKET-137 — Reconciliation import service
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
}

export default new ReconciliationService(authProvider);
