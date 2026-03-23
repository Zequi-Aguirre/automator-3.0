// TICKET-137 — Reconciliation import service
import { authProvider, AxiosProvider } from '../config/axiosProvider';

type Platform = 'sellers' | 'compass' | 'pickle'; // internal — derived from CSV, not user-selected

export interface PlatformBuyerSummary {
    platform_buyer_id: string;
    platform_buyer_name: string | null;
    platform_buyer_email: string | null;
    platform_buyer_products: string[];
    row_count: number;
    saved_automator_buyer_id: string | null;
}

export interface PreviewResult {
    row_count: number;
    platform: Platform;
    platform_buyers: PlatformBuyerSummary[];
    file_token: string;
}

export interface BuyerMapping {
    platform_buyer_id: string;
    automator_buyer_id: string | null;
}

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

    async previewFile(file: File): Promise<PreviewResult> {
        const form = new FormData();
        form.append('file', file);
        const res = await this.api.getApi().post('/api/reconciliation/import/preview', form);
        return res.data;
    }

    async confirmImport(
        fileToken: string,
        buyerMappings: BuyerMapping[]
    ): Promise<ImportResult> {
        const res = await this.api.getApi().post('/api/reconciliation/import/confirm', {
            file_token: fileToken,
            buyer_mappings: buyerMappings,
        });
        return res.data;
    }

    async getLastBatches(): Promise<ImportBatch[]> {
        const res = await this.api.getApi().get('/api/reconciliation/batches');
        return res.data;
    }
}

export default new ReconciliationService(authProvider);
