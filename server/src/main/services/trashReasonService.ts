import { injectable } from "tsyringe";
import TrashReasonDAO from "../data/trashReasonDAO";
import ActivityService from "./activityService";
import { TrashReasonCreateDTO, TrashReason } from "../types/trashReasonTypes";
import { TrashReasonAction } from "../types/activityTypes";

@injectable()
export default class TrashReasonService {
    constructor(
        private readonly trashReasonDAO: TrashReasonDAO,
        private readonly activityService: ActivityService,
    ) {}

    async getAll(): Promise<TrashReason[]> {
        return this.trashReasonDAO.getAll();
    }

    async getActive(): Promise<TrashReason[]> {
        return this.trashReasonDAO.getActive();
    }

    async create(data: TrashReasonCreateDTO, userId?: string | null): Promise<TrashReason> {
        if (!data.label || data.label.trim().length === 0) {
            throw new Error('Label is required');
        }
        const reason = await this.trashReasonDAO.create({ ...data, label: data.label.trim() });
        await this.activityService.log({
            user_id: userId,
            action: TrashReasonAction.CREATED,
            action_details: { label: reason.label },
        });
        return reason;
    }

    async setActive(id: string, active: boolean, userId?: string | null): Promise<TrashReason> {
        const reason = await this.trashReasonDAO.setActive(id, active);
        await this.activityService.log({
            user_id: userId,
            action: active ? TrashReasonAction.ACTIVATED : TrashReasonAction.DEACTIVATED,
            action_details: { label: reason.label },
        });
        return reason;
    }

    async setCommentRequired(id: string, commentRequired: boolean, userId?: string | null): Promise<TrashReason> {
        const reason = await this.trashReasonDAO.setCommentRequired(id, commentRequired);
        await this.activityService.log({
            user_id: userId,
            action: commentRequired ? TrashReasonAction.COMMENT_REQUIRED_ON : TrashReasonAction.COMMENT_REQUIRED_OFF,
            action_details: { label: reason.label },
        });
        return reason;
    }

    async delete(id: string, userId?: string | null): Promise<TrashReason> {
        const reason = await this.trashReasonDAO.delete(id);
        await this.activityService.log({
            user_id: userId,
            action: TrashReasonAction.DELETED,
            action_details: { label: reason.label },
        });
        return reason;
    }
}
