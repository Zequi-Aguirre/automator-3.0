import { injectable } from "tsyringe";
import WorkerService from "../../services/workerService";

@injectable()
export default class SendLeadsJob {

    constructor(
        private readonly workerService: WorkerService
    ) {}

    async execute(): Promise<void> {
        // Note: Timing check now handled per-buyer in BuyerDispatchService
        // processAllBuyers loops through all worker buyers and processes their queues

        const sendCount = await this.workerService.processAllBuyers();

        if (sendCount > 0) {
            console.log(`[SendLeadsJob] ✓ Sent ${sendCount} lead(s) to eligible buyers`);
        } else {
            console.log(`[SendLeadsJob] No leads sent (no eligible buyers or no leads available)`);
        }
    }
}