import { injectable } from "tsyringe";
import ActivityDAO from "../data/activityDAO";
import UserDAO from "../data/userDAO";
import { ActivityCreateDTO } from "../types/activityTypes";

// Email of the System/Worker service account.
// The UUID is resolved at runtime via UserDAO.getIdByEmail so that it does not
// need to be hardcoded and works across any DB seed configuration.
const SYSTEM_USER_EMAIL = 'system@automator';

@injectable()
export default class ActivityService {
    private systemUserIdCache: string | null | undefined = undefined; // undefined = not yet fetched

    constructor(
        private readonly activityDAO: ActivityDAO,
        private readonly userDAO: UserDAO
    ) {}

    /**
     * Returns the UUID of the System service account.
     * Result is cached after the first successful lookup.
     */
    async getSystemUserId(): Promise<string | null> {
        if (this.systemUserIdCache !== undefined) return this.systemUserIdCache;
        this.systemUserIdCache = await this.userDAO.getIdByEmail(SYSTEM_USER_EMAIL);
        return this.systemUserIdCache;
    }

    async hasActivity(leadId: string, action: string): Promise<boolean> {
        return this.activityDAO.hasForLead(leadId, action);
    }

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
