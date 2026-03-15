import { authProvider, AxiosProvider } from "../config/axiosProvider";

class WorkerService {
    constructor(private readonly api: AxiosProvider) {}

    async getStatus(): Promise<{
        queued: boolean;
        cron_schedule: string | null;
        running: boolean;
    }> {
        const response = await this.api.getApi().get("/api/worker/admin/status");
        return response.data;
    }

    async startWorker(): Promise<{ success: boolean; message: string }> {
        const response = await this.api.getApi().patch("/api/worker/admin/start");
        return response.data;
    }

    async stopWorker(): Promise<{ success: boolean; message: string }> {
        const response = await this.api.getApi().patch("/api/worker/admin/stop");
        return response.data;
    }

    async updateCronSchedule(cron_schedule: string): Promise<{
        success: boolean;
        message: string;
        cron_schedule: string;
    }> {
        const response = await this.api.getApi().patch(
            "/api/worker/admin/update-cron",
            { cron_schedule }
        );
        return response.data;
    }
}

const workerService = new WorkerService(authProvider);

export default workerService;