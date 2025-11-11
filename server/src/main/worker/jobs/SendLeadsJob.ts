import { injectable } from 'tsyringe';
import LeadService from "../../services/leadService.ts";
import SettingsService from "../../services/settingsService.ts";

// Update SendLeadsJob to use workerSend
@injectable()
export default class SendLeadsJob {
    constructor(
        private readonly leadService: LeadService,
        private readonly workerSettingsService: SettingsService
    ) {}

    async execute() {
        const currentSettings = await this.workerSettingsService.getWorkerSettings();
        const { send_next_lead_at } = currentSettings!
        console.log('----- SendLeadsJob: Checking if it is time to send a lead');
        console.log(`----- SendLeadsJob: Next lead time is ${send_next_lead_at}`);
        if (send_next_lead_at && new Date(send_next_lead_at) > new Date()) {
            console.log('----- SendLeadsJob: Not time to send a lead yet');
            return;
        }
        const workerId = await this.workerSettingsService.getWorkerId();
        const leads = await this.leadService.getLeadsToSendByWorker();
        for (const lead of leads) {
            console.log(`----- SendLeadsJob: Sending lead with id ${lead.id}`);
            console.log(`----- SendLeadsJob: Using worker id ${workerId}`);
            // await this.leadService.sendLead(lead.id, workerId);
        }
        console.log(`----- SendLeadsJob: Processed ${leads.length} leads`);
    }
}