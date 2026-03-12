import { injectable } from "tsyringe";
import ActivityDAO from "../data/activityDAO";
import { ActivityCreateDTO } from "../types/activityTypes";

@injectable()
export default class ActivityService {
    constructor(private readonly activityDAO: ActivityDAO) {}

    // Never throws — activity logging must never crash the main flow
    async log(dto: ActivityCreateDTO): Promise<void> {
        try {
            await this.activityDAO.log(dto);
        } catch (err) {
            console.error('Activity log failed (non-fatal):', err);
        }
    }

    async getByLead(leadId: string) {
        return this.activityDAO.getByLeadId(leadId);
    }

    async getByUser(userId: string) {
        return this.activityDAO.getByUserId(userId);
    }

    async getRecent() {
        return this.activityDAO.getRecent();
    }

    async getUserStats(days?: number) {
        return this.activityDAO.getUserStats(days);
    }
}
