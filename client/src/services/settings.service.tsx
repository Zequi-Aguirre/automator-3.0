import {authProvider, AxiosProvider} from "../config/axiosProvider";
import {WorkerSettings, EnvironmentSettings} from "../types/settingsTypes";
import {TemplateResponse} from "../utils/TemplateSwitcher.ts";

class SettingsService {
    constructor(private readonly api: AxiosProvider) {
    }

    // Get current settings
    async getWorkerSettings(): Promise<WorkerSettings> {
        const response = await this.api.getApi().get('/api/settings/admin/worker-settings');
        return response.data;
    }

    async getEnvSettings(): Promise<EnvironmentSettings> {
        const response = await this.api.getApi().get('/api/settings/env-settings');
        return response.data;
    }

    async getTemplateSettings(): Promise<TemplateResponse> {
        const response = await this.api.getApi().get('/api/settings/template-settings');
        return response.data;
    }

    // isAllowedLogin by url
    async isAllowedLogin(): Promise<boolean> {
        const response = await this.api.getApi().get(`/api/settings/is-allowed-login`);
        return response.data;
    }

    // Update settings
    async updateSettings(settings: Partial<WorkerSettings>): Promise<WorkerSettings> {
        const response = await this.api.getApi().patch(`/api/settings/admin/update`, settings);
        return response.data;
    }
}

const settingsService = new SettingsService(authProvider);

export default settingsService;