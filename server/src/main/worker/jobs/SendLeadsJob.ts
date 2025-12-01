import { injectable } from "tsyringe";
import WorkerService from "../../services/workerService";

@injectable()
export default class SendLeadsJob {

    constructor(
        private readonly workerService: WorkerService
    ) {}

    async execute(): Promise<void> {
        const ready = await this.workerService.isTimeToSend();
        if (!ready) {
            console.log("SendLeadsJob: Not time yet");
            return;
        }

        const sent = await this.workerService.sendNextLead();
        console.log(`SendLeadsJob: Sent lead ${sent.id}`);
    }
}