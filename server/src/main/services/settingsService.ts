import { injectable } from "tsyringe";
import { WorkerSettings } from "../types/settingsTypes";
import WorkerSettingsDAO from "../data/workerSettingsDAO";
import JobDAO from "../data/jobDAO.ts";

@injectable()
export default class SettingsService {
    constructor(
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly jobDAO: JobDAO,
    ) {}

    async createSettings(settings: {
        name: string;
        business_hours_start: number;
        business_hours_end: number;
        cron_schedule: string;
        worker_enabled: boolean;
    }): Promise<WorkerSettings> {
        return this.workerSettingsDAO.createSettings(settings);
    }

    async getWorkerSettings(): Promise<WorkerSettings | null> {
        try {
            return await this.workerSettingsDAO.getCurrentSettings();
        } catch {
            return null;
        }
    }

    async getWorkerId(): Promise<string> {
        return this.jobDAO.getWorkerId();
    }

    async updateSettings(
        settings: Partial<WorkerSettings>
    ): Promise<WorkerSettings> {
        return this.workerSettingsDAO.updateSettings(settings);
    }

    async updateLastWorkerRun(id: string): Promise<WorkerSettings> {
        return this.workerSettingsDAO.updateLastWorkerRun(id);
    }

    // NOTE: updateNextLeadTime() removed - send_next_lead_at moved to buyers table (TICKET-021)
}