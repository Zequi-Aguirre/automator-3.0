import { injectable } from 'tsyringe';
import PlatformLeadRecordDAO from '../data/platformLeadRecordDAO';
import LeadDAO from '../data/leadDAO';
import SendLogDAO from '../data/sendLogDAO';
import ActivityService from './activityService';
import { PlatformLeadRecord } from '../types/reconciliationTypes';
import { ReconciliationAction } from '../types/activityTypes';

export type MatchingStats = {
    processed: number;
    matched: number;
    ambiguous: number;
    unmatched: number;
};

type MatchResult = {
    status: 'matched' | 'unmatched' | 'ambiguous';
    leadId: string | null;
    sendLogId: string | null;
};

@injectable()
export default class ReconciliationMatchingService {
    constructor(
        private readonly recordDAO: PlatformLeadRecordDAO,
        private readonly leadDAO: LeadDAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly activityService: ActivityService
    ) {}

    async runMatching(batchId?: string, triggeredBy?: string | null): Promise<MatchingStats> {
        const pending = await this.recordDAO.getPendingRecords(batchId);

        const stats: MatchingStats = { processed: pending.length, matched: 0, ambiguous: 0, unmatched: 0 };

        for (const record of pending) {
            const result = await this.matchRecord(record);
            await this.recordDAO.setMatchResult(
                record.id,
                result.status,
                result.leadId,
                result.sendLogId
            );
            stats[result.status]++;
        }

        await this.activityService.log({
            user_id: triggeredBy ?? null,
            action: ReconciliationAction.MATCHED,
            action_details: {
                batch_id: batchId ?? null,
                ...stats,
            },
        });

        console.info('Reconciliation matching complete', { batchId, ...stats });
        return stats;
    }

    private async matchRecord(record: PlatformLeadRecord): Promise<MatchResult> {
        // ── Tier 1: Phone match ────────────────────────────────────────────────
        if (record.phone_normalized) {
            const leads = await this.leadDAO.getByNormalizedPhone(record.phone_normalized);

            if (leads.length === 1) {
                const sendLog = record.automator_buyer_id
                    ? await this.sendLogDAO.getLatestByLeadAndBuyer(leads[0].id, record.automator_buyer_id)
                    : null;
                return { status: 'matched', leadId: leads[0].id, sendLogId: sendLog?.id ?? null };
            }

            if (leads.length > 1 && record.automator_buyer_id) {
                // Disambiguate: find which of the phone-matched leads was sent to this buyer
                const withLog = await Promise.all(
                    leads.map(async l => ({
                        id: l.id,
                        sendLog: await this.sendLogDAO.getLatestByLeadAndBuyer(l.id, record.automator_buyer_id!),
                    }))
                );
                const candidates = withLog.filter(l => l.sendLog !== null);
                if (candidates.length === 1) {
                    return {
                        status: 'matched',
                        leadId: candidates[0].id,
                        sendLogId: candidates[0].sendLog!.id,
                    };
                }
                // Multiple leads sent to this buyer with same phone — truly ambiguous
                return { status: 'ambiguous', leadId: null, sendLogId: null };
            }

            if (leads.length > 1) {
                return { status: 'ambiguous', leadId: null, sendLogId: null };
            }
        }

        // ── Tier 2: Email fallback ─────────────────────────────────────────────
        if (record.email) {
            const leads = await this.leadDAO.getByEmail(record.email);

            if (leads.length === 1) {
                const sendLog = record.automator_buyer_id
                    ? await this.sendLogDAO.getLatestByLeadAndBuyer(leads[0].id, record.automator_buyer_id)
                    : null;
                return { status: 'matched', leadId: leads[0].id, sendLogId: sendLog?.id ?? null };
            }

            if (leads.length > 1 && record.automator_buyer_id) {
                const withLog = await Promise.all(
                    leads.map(async l => ({
                        id: l.id,
                        sendLog: await this.sendLogDAO.getLatestByLeadAndBuyer(l.id, record.automator_buyer_id!),
                    }))
                );
                const candidates = withLog.filter(l => l.sendLog !== null);
                if (candidates.length === 1) {
                    return {
                        status: 'matched',
                        leadId: candidates[0].id,
                        sendLogId: candidates[0].sendLog!.id,
                    };
                }
                return { status: 'ambiguous', leadId: null, sendLogId: null };
            }

            if (leads.length > 1) {
                return { status: 'ambiguous', leadId: null, sendLogId: null };
            }
        }

        return { status: 'unmatched', leadId: null, sendLogId: null };
    }
}
