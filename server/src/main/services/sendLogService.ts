import { injectable } from "tsyringe";
import SendLogDAO from "../data/sendLogDAO.ts";
import ActivityService from "./activityService.ts";
import { SendLog, SendLogInsert, SendLogUpdate } from "../types/sendLogTypes.ts";
import { DisputeAction } from "../types/activityTypes.ts";

@injectable()
export default class SendLogService {
    constructor(
        private readonly sendLogDAO: SendLogDAO,
        private readonly activityService: ActivityService,
    ) {}

    async createLog(data: SendLogInsert): Promise<SendLog> {
        return await this.sendLogDAO.createLog(data);
    }

    async getMany(filters: {
        page: number;
        limit: number;
        status?: string;
        investor_id?: string;
        source_id?: string;  // TICKET-046: Renamed from affiliate_id
        campaign_id?: string;
        county_id?: string;
    }): Promise<{ logs: SendLog[]; count: number }> {
        return await this.sendLogDAO.getMany(filters);
    }

    async updateLog(id: string, updates: SendLogUpdate): Promise<SendLog> {
        return await this.sendLogDAO.updateLog(id, updates);
    }

    async getLastByInvestor(investorId: string): Promise<SendLog | null> {
        return await this.sendLogDAO.getLastByInvestor(investorId);
    }

    async getLastByCounty(countyId: string): Promise<SendLog | null> {
        return await this.sendLogDAO.getLastByCounty(countyId);
    }

    async getLatestLogsByInvestorIds(investorIds: string[]): Promise<SendLog[]> {
        return await this.sendLogDAO.getLatestLogsByInvestorIds(investorIds);
    }

    async getLatestLogsByCountyIds(countyIds: string[]): Promise<SendLog[]> {
        return await this.sendLogDAO.getLatestLogsByCountyIds(countyIds);
    }

    async disputeLog(id: string, reason: string, buyerName: string | null, userId: string | null): Promise<SendLog> {
        const log = await this.sendLogDAO.disputeLog(id, reason, buyerName, userId);
        await this.activityService.log({
            user_id: userId,
            action: DisputeAction.CREATED,
            action_details: { send_log_id: id, reason, buyer_name: buyerName },
        });
        return log;
    }

    async undisputeLog(id: string, userId: string | null): Promise<SendLog> {
        const log = await this.sendLogDAO.undisputeLog(id);
        await this.activityService.log({
            user_id: userId,
            action: DisputeAction.REMOVED,
            action_details: { send_log_id: id },
        });
        return log;
    }
}