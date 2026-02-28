import { injectable } from "tsyringe";
import WorkerService from "../../services/workerService";

@injectable()
export default class SendLeadsJob {

    constructor(
        private readonly workerService: WorkerService
    ) {}

    async execute(): Promise<void> {
        // Note: Timing check now handled per-buyer in sendNextLead()
        // No need for global isTimeToSend() check

        const sendCount = await this.workerService.sendNextLead();

        if (sendCount > 0) {
            console.log(`[SendLeadsJob] Sent ${sendCount} lead(s) to eligible buyers`);
        } else {
            console.log(`[SendLeadsJob] No leads sent (no eligible buyers or no leads available)`);
        }
    }
}