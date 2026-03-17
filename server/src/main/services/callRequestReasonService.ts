import { injectable } from "tsyringe";
import CallRequestReasonDAO from "../data/callRequestReasonDAO";
import ActivityService from "./activityService";
import { CallRequestReasonCreateDTO, CallRequestReason } from "../types/callRequestReasonTypes";
import { CallRequestReasonAction } from "../types/activityTypes";

@injectable()
export default class CallRequestReasonService {
    constructor(
        private readonly callRequestReasonDAO: CallRequestReasonDAO,
        private readonly activityService: ActivityService,
    ) {}

    async getAll(): Promise<CallRequestReason[]> {
        return this.callRequestReasonDAO.getAll();
    }

    async getActive(): Promise<CallRequestReason[]> {
        return this.callRequestReasonDAO.getActive();
    }

    async create(data: CallRequestReasonCreateDTO, userId?: string | null): Promise<CallRequestReason> {
        if (!data.label || data.label.trim().length === 0) {
            throw new Error('Label is required');
        }
        const reason = await this.callRequestReasonDAO.create({ ...data, label: data.label.trim() });
        await this.activityService.log({
            user_id: userId,
            action: CallRequestReasonAction.CREATED,
            action_details: { label: reason.label },
        });
        return reason;
    }

    async setActive(id: string, active: boolean, userId?: string | null): Promise<CallRequestReason> {
        const reason = await this.callRequestReasonDAO.setActive(id, active);
        await this.activityService.log({
            user_id: userId,
            action: active ? CallRequestReasonAction.ACTIVATED : CallRequestReasonAction.DEACTIVATED,
            action_details: { label: reason.label },
        });
        return reason;
    }
}
