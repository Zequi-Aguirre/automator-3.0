import { authProvider, AxiosProvider } from "../config/axiosProvider";
import {SendLog} from "../types/sendLogTypes.ts";

class SendLogService {
    constructor(private readonly api: AxiosProvider) {}

    async getMany(params: {
        page: number;
        limit: number;
        status?: "sent" | "failed";
        source_id?: string;
        campaign_id?: string;
        county_id?: string;
    }): Promise<{ logs: SendLog[]; count: number }> {
        const res = await this.api.getApi().get("/api/logs/get-many", {
            params,
        });
        return res.data;
    }

    async updateLog(
        logId: string,
        updates: Partial<Pick<SendLog, "status" | "response_code" | "response_body" | "payout_cents">>
    ): Promise<SendLog> {
        const res = await this.api.getApi().patch(`/api/logs/update/${logId}`, updates);
        return res.data;
    }

    async disputeLog(logId: string, reason: string, buyerName?: string): Promise<SendLog> {
        const res = await this.api.getApi().patch(`/api/logs/${logId}/dispute`, { reason, buyer_name: buyerName ?? null });
        return res.data;
    }

    async undisputeLog(logId: string): Promise<SendLog> {
        const res = await this.api.getApi().patch(`/api/logs/${logId}/undispute`);
        return res.data;
    }
}

const sendLogService = new SendLogService(authProvider);
export default sendLogService;