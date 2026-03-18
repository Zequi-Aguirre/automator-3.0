import { injectable } from "tsyringe";
import CallOutcomeDAO from "../data/callOutcomeDAO";
import ActivityService from "./activityService";
import { CallOutcome, CallOutcomeCreateDTO } from "../types/callOutcomeTypes";
import { CallOutcomeAction } from "../types/activityTypes";

@injectable()
export default class CallOutcomeService {
    constructor(
        private readonly callOutcomeDAO: CallOutcomeDAO,
        private readonly activityService: ActivityService,
    ) {}

    async getAll(): Promise<CallOutcome[]> {
        return this.callOutcomeDAO.getAll();
    }

    async getActive(): Promise<CallOutcome[]> {
        return this.callOutcomeDAO.getActive();
    }

    async create(data: CallOutcomeCreateDTO, userId?: string | null): Promise<CallOutcome> {
        if (!data.label || data.label.trim().length === 0) {
            throw new Error('Label is required');
        }
        const outcome = await this.callOutcomeDAO.create({ ...data, label: data.label.trim() });
        await this.activityService.log({
            user_id: userId,
            action: CallOutcomeAction.CREATED,
            action_details: { label: outcome.label },
        });
        return outcome;
    }

    async setActive(id: string, active: boolean, userId?: string | null): Promise<CallOutcome> {
        const outcome = await this.callOutcomeDAO.setActive(id, active);
        await this.activityService.log({
            user_id: userId,
            action: active ? CallOutcomeAction.ACTIVATED : CallOutcomeAction.DEACTIVATED,
            action_details: { label: outcome.label },
        });
        return outcome;
    }

    async setCommentRequired(id: string, commentRequired: boolean, userId?: string | null): Promise<CallOutcome> {
        const outcome = await this.callOutcomeDAO.setCommentRequired(id, commentRequired);
        await this.activityService.log({
            user_id: userId,
            action: commentRequired ? CallOutcomeAction.COMMENT_REQUIRED_ON : CallOutcomeAction.COMMENT_REQUIRED_OFF,
            action_details: { label: outcome.label },
        });
        return outcome;
    }

    async setResolvesCall(id: string, resolvesCall: boolean, userId?: string | null): Promise<CallOutcome> {
        const outcome = await this.callOutcomeDAO.setResolvesCall(id, resolvesCall);
        await this.activityService.log({
            user_id: userId,
            action: resolvesCall ? CallOutcomeAction.RESOLVES_CALL_ON : CallOutcomeAction.RESOLVES_CALL_OFF,
            action_details: { label: outcome.label },
        });
        return outcome;
    }

    async getById(id: string): Promise<CallOutcome | null> {
        return this.callOutcomeDAO.getById(id);
    }

    async delete(id: string, userId?: string | null): Promise<CallOutcome> {
        const outcome = await this.callOutcomeDAO.delete(id);
        await this.activityService.log({
            user_id: userId,
            action: CallOutcomeAction.DELETED,
            action_details: { label: outcome.label },
        });
        return outcome;
    }
}
