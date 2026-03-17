import { authProvider, AxiosProvider } from "../config/axiosProvider";

export interface CallOutcome {
    id: string;
    label: string;
    active: boolean;
    sort_order: number;
    created: string;
}

class CallOutcomeService {
    constructor(private readonly api: AxiosProvider) {}

    async getActive(): Promise<CallOutcome[]> {
        const res = await this.api.getApi().get('/api/call-outcomes');
        return res.data;
    }

    async getAll(): Promise<CallOutcome[]> {
        const res = await this.api.getApi().get('/api/call-outcomes/all');
        return res.data;
    }

    async create(label: string, sort_order?: number): Promise<CallOutcome> {
        const res = await this.api.getApi().post('/api/call-outcomes', { label, sort_order });
        return res.data;
    }

    async setActive(id: string, active: boolean): Promise<CallOutcome> {
        const res = await this.api.getApi().patch(`/api/call-outcomes/${id}/active`, { active });
        return res.data;
    }

    async delete(id: string): Promise<CallOutcome> {
        const res = await this.api.getApi().delete(`/api/call-outcomes/${id}`);
        return res.data;
    }
}

const callOutcomeService = new CallOutcomeService(authProvider);
export default callOutcomeService;
