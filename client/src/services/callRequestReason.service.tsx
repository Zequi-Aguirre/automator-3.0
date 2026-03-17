import { authProvider, AxiosProvider } from "../config/axiosProvider";

export interface CallRequestReason {
    id: string;
    label: string;
    active: boolean;
    comment_required: boolean;
    sort_order: number;
    created: string;
}

class CallRequestReasonService {
    constructor(private readonly api: AxiosProvider) {}

    async getActive(): Promise<CallRequestReason[]> {
        const res = await this.api.getApi().get('/api/call-request-reasons');
        return res.data;
    }

    async getAll(): Promise<CallRequestReason[]> {
        const res = await this.api.getApi().get('/api/call-request-reasons/all');
        return res.data;
    }

    async create(label: string, sort_order?: number): Promise<CallRequestReason> {
        const res = await this.api.getApi().post('/api/call-request-reasons', { label, sort_order });
        return res.data;
    }

    async setActive(id: string, active: boolean): Promise<CallRequestReason> {
        const res = await this.api.getApi().patch(`/api/call-request-reasons/${id}/active`, { active });
        return res.data;
    }

    async setCommentRequired(id: string, comment_required: boolean): Promise<CallRequestReason> {
        const res = await this.api.getApi().patch(`/api/call-request-reasons/${id}/comment-required`, { comment_required });
        return res.data;
    }
}

const callRequestReasonService = new CallRequestReasonService(authProvider);
export default callRequestReasonService;
