import { injectable } from 'tsyringe';
import LeadService from "../../services/leadService.ts";
import SettingsService from "../../services/settingsService.ts";
import { Lead } from "../../types/leadTypes.ts";

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
        const lead: Lead = await this.leadService.getLeadToSendByWorker();
        const sentLead = await this.leadService.sendLead(lead.id);
        console.log(`----- SendLeadsJob: Processed ${sentLead.first_name} leads`);
        const { minutes_range_start, minutes_range_end } = currentSettings!;
        const nextLeadTime = new Date();
        const randomNumber = Math.floor(Math.random() * (minutes_range_end - minutes_range_start + 1)) + minutes_range_start;
        nextLeadTime.setMinutes(nextLeadTime.getMinutes() + randomNumber);
        await this.workerSettingsService.updateNextLeadTime(currentSettings!.id, nextLeadTime.toISOString());
    }
}