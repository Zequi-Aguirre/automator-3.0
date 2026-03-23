import { injectable } from 'tsyringe';
import ReconciliationMatchingService from '../../services/reconciliationMatchingService';

// TICKET-139: Daily job that re-runs the reconciliation matching engine
// across all pending platform_lead_records. Scheduled every 24h (6 AM EST on seed).

@injectable()
export default class PlatformSyncJob {
    constructor(
        private readonly matchingService: ReconciliationMatchingService
    ) {}

    async execute(): Promise<void> {
        console.log('[PlatformSyncJob] Starting reconciliation matching run...');
        const stats = await this.matchingService.runMatching(undefined, null);
        console.log('[PlatformSyncJob] Done.', stats);
    }
}
