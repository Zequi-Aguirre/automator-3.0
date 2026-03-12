import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import WorkerSettingsDAO from "../data/workerSettingsDAO";
import BuyerDAO from "../data/buyerDAO";
import BuyerDispatchService from "../services/buyerDispatchService";
import ActivityService from "../services/activityService";

@injectable()
export default class WorkerService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly buyerDAO: BuyerDAO,
        private readonly buyerDispatchService: BuyerDispatchService,
        private readonly activityService: ActivityService
    ) {}

    /**
     * Process all worker buyers
     * Main worker method - processes each eligible worker buyer's queue
     *
     * @returns Count of successful sends
     */
    async processAllBuyers(): Promise<number> {
        // Get all buyers with dispatch_mode 'worker' or 'both'
        const allBuyers = await this.buyerDAO.getByPriority();
        const workerBuyers = allBuyers.filter(b =>
            b.dispatch_mode === 'worker' || b.dispatch_mode === 'both'
        );

        if (workerBuyers.length === 0) {
            console.log('[Worker] No worker buyers configured');
            return 0;
        }

        console.log(`[Worker] Found ${workerBuyers.length} worker buyers to process`);

        let sendCount = 0;

        // Process each buyer's queue independently
        for (const buyer of workerBuyers) {
            try {
                const log = await this.buyerDispatchService.processBuyerQueue(buyer.id);
                if (log) {
                    sendCount++;
                    console.log(`[Worker] ✓ Sent lead to ${buyer.name} (priority ${buyer.priority})`);
                }
            } catch (error) {
                // Log error but continue to next buyer
                console.error(`[Worker] ✗ Failed to process buyer ${buyer.name}:`, error);
            }
        }

        return sendCount;
    }

    /**
     * Trash expired leads based on worker settings
     *
     * @returns Count of trashed leads
     */
    async trashExpiredLeads(): Promise<number> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();

        // Check if expiration enforcement is enabled
        if (!settings.enforce_expiration) {
            console.log('[Worker] Expiration enforcement disabled - skipping trash expired leads');
            return 0;
        }

        const expireHours =
            Number(settings.expire_after_hours) || 18;

        const reason = `EXPIRED_${expireHours}_HOURS`;

        const trashedIds = await this.leadDAO.trashExpiredLeads(expireHours, reason);

        for (const leadId of trashedIds) {
            await this.activityService.log({
                lead_id: leadId,
                action: 'lead_trashed',
                action_details: { reason }
            });
        }

        return trashedIds.length;
    }
}
