import { injectable } from "tsyringe";
import SendLogDAO from "../data/sendLogDAO.ts";
import { SendLog, SendLogInsert, SendLogUpdate } from "../types/sendLogTypes.ts";

@injectable()
export default class SendLogService {
    constructor(private readonly sendLogDAO: SendLogDAO) {}

    async createLog(data: SendLogInsert): Promise<SendLog> {
        return await this.sendLogDAO.createLog(data);
    }

    async getMany(filters: {
        page: number;
        limit: number;
        status?: string;
        affiliate_id?: string;
        campaign_id?: string;
        county_id?: string;
    }): Promise<{ logs: SendLog[]; count: number }> {
        return await this.sendLogDAO.getMany(filters);
    }

    async updateLog(id: string, updates: SendLogUpdate): Promise<SendLog> {
        return await this.sendLogDAO.updateLog(id, updates);
    }

    async getLastByCounty(countyId: string): Promise<SendLog | null> {
        return await this.sendLogDAO.getLastByCounty(countyId);
    }

    async getLatestLogsByCountyIds(countyIds: string[]): Promise<SendLog[]> {
        return await this.sendLogDAO.getLatestLogsByCountyIds(countyIds);
    }
}