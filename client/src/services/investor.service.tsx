import { authProvider, AxiosProvider } from "../config/axiosProvider";
import {Investor} from "../types/investorTypes.ts";

class InvestorService {
    constructor(private readonly api: AxiosProvider) {}

    async getMany(params: { page: number; limit: number }): Promise<{ investors: Investor[]; count: number }> {
        const res = await this.api.getApi().get('/api/investors/admin/get-many', {
            params
        });
        console.log(res.data);
        return res.data;
    }

    async updateInvestorMeta(
        investorId: string,
        updates: { rating?: number; blacklisted?: boolean }
    ): Promise<Investor> {
        const res = await this.api.getApi().patch(`/api/investors/admin/update-meta/${investorId}`, updates);
        return res.data;
    }

    async getById(investorId: string): Promise<Investor> {
        const res = await this.api.getApi().get(`/api/investors/admin/${investorId}`);
        return res.data;
    }
}

const investorService = new InvestorService(authProvider);
export default investorService;