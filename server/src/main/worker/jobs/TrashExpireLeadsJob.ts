import { injectable } from "tsyringe";
import WorkerService from "../../services/workerService";

@injectable()
export default class TrashExpireLeadsJob {

    constructor(
        private readonly workerService: WorkerService
    ) {}

    async execute(): Promise<void> {
        const trashedCount = await this.workerService.trashExpiredLeads();

        if (trashedCount === 0) {
            console.log("TrashExpireLeadsJob: No expired leads to trash");
            return;
        }

        console.log(`TrashExpireLeadsJob: Trashed ${trashedCount} expired leads`);
    }
}