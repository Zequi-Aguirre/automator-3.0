import {authProvider, AxiosProvider} from "../config/axiosProvider";
import {WorkerSettings} from "../types/settingsTypes";

class SettingsService {
    constructor(private readonly api: AxiosProvider) {
    }

    // Get current settings
    async getWorkerSettings(): Promise<WorkerSettings> {
        const response = await this.api.getApi().get('/api/settings/worker-settings');
        return response.data;
    }

    // Update settings
    async updateSettings(settings: Partial<WorkerSettings>): Promise<WorkerSettings> {
        const response = await this.api.getApi().patch(`/api/settings/update`, settings);
        return response.data;
    }
}

const settingsService = new SettingsService(authProvider);

export default settingsService;