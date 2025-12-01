import { authProvider, AxiosProvider } from "../config/axiosProvider";
import {SendLog} from "../types/sendLogTypes.ts";

class SendLogService {
    constructor(private readonly api: AxiosProvider) {}

    async getMany(params: {
        page: number;
        limit: number;
        status?: "sent" | "failed";
        investor_id?: string;
        affiliate_id?: string;
        campaign_id?: string;
        county_id?: string;
    }): Promise<{ logs: SendLog[]; count: number }> {
        const res = await this.api.getApi().get("/api/logs/admin/get-many", {
            params,
        });
        return res.data;
    }

    async updateLog(
        logId: string,
        updates: Partial<Pick<SendLog, "status" | "response_code" | "response_body" | "payout_cents">>
    ): Promise<SendLog> {
        const res = await this.api.getApi().patch(`/api/logs/admin/update/${logId}`, updates);
        return res.data;
    }
}

const sendLogService = new SendLogService(authProvider);
export default sendLogService;