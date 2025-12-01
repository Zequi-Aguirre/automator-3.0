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
        investor_id?: string;
        affiliate_id?: string;
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
}