import { authProvider, AxiosProvider } from "../config/axiosProvider";

export interface TrashReason {
    id: string;
    label: string;
    active: boolean;
    comment_required: boolean;
    sort_order: number;
    created: string;
}

class TrashReasonService {
    constructor(private readonly api: AxiosProvider) {}

    async getActive(): Promise<TrashReason[]> {
        const res = await this.api.getApi().get('/api/trash-reasons');
        return res.data;
    }

    async getAll(): Promise<TrashReason[]> {
        const res = await this.api.getApi().get('/api/trash-reasons/all');
        return res.data;
    }

    async create(label: string, sort_order?: number): Promise<TrashReason> {
        const res = await this.api.getApi().post('/api/trash-reasons', { label, sort_order });
        return res.data;
    }

    async setActive(id: string, active: boolean): Promise<TrashReason> {
        const res = await this.api.getApi().patch(`/api/trash-reasons/${id}/active`, { active });
        return res.data;
    }

    async setCommentRequired(id: string, comment_required: boolean): Promise<TrashReason> {
        const res = await this.api.getApi().patch(`/api/trash-reasons/${id}/comment-required`, { comment_required });
        return res.data;
    }

    async delete(id: string): Promise<TrashReason> {
        const res = await this.api.getApi().delete(`/api/trash-reasons/${id}`);
        return res.data;
    }
}

const trashReasonService = new TrashReasonService(authProvider);
export default trashReasonService;
