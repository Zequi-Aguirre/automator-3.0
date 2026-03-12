import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { ActivityLog, UserActivityStats } from "../types/activityTypes";

class ActivityService {
    constructor(private readonly api: AxiosProvider) {}

    async getRecent(): Promise<ActivityLog[]> {
        const res = await this.api.getApi().get("/api/activity/recent");
        return res.data.logs;
    }

    async getStats(): Promise<UserActivityStats[]> {
        const res = await this.api.getApi().get("/api/activity/stats");
        return res.data.stats;
    }

    async getByLead(leadId: string): Promise<ActivityLog[]> {
        const res = await this.api.getApi().get(`/api/activity/lead/${leadId}`);
        return res.data.logs;
    }

    async getByUser(userId: string): Promise<ActivityLog[]> {
        const res = await this.api.getApi().get(`/api/activity/user/${userId}`);
        return res.data.logs;
    }
}

const activityService = new ActivityService(authProvider);
export default activityService;
