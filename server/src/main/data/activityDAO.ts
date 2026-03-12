import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { LeadAction, ActivityLog, ActivityCreateDTO, UserActivityStats } from "../types/activityTypes";

@injectable()
export default class ActivityDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async log(dto: ActivityCreateDTO): Promise<void> {
        await this.db.none(
            `INSERT INTO activity_log (user_id, lead_id, entity_type, entity_id, action, action_details)
             VALUES ($[user_id], $[lead_id], $[entity_type], $[entity_id], $[action], $[action_details])`,
            {
                user_id: dto.user_id ?? null,
                lead_id: dto.lead_id ?? null,
                entity_type: dto.entity_type ?? null,
                entity_id: dto.entity_id ?? null,
                action: dto.action,
                action_details: dto.action_details ? JSON.stringify(dto.action_details) : null
            }
        );
    }

    async getByLeadId(leadId: string): Promise<ActivityLog[]> {
        return this.db.manyOrNone(
            `SELECT a.*, u.name as user_name
             FROM activity_log a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.lead_id = $[leadId]
             ORDER BY a.created DESC`,
            { leadId }
        );
    }

    async getByUserId(userId: string, limit = 200): Promise<ActivityLog[]> {
        return this.db.manyOrNone(
            `SELECT a.*, u.name as user_name
             FROM activity_log a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.user_id = $[userId]
             ORDER BY a.created DESC
             LIMIT $[limit]`,
            { userId, limit }
        );
    }

    async getRecent(limit = 100): Promise<ActivityLog[]> {
        return this.db.manyOrNone(
            `SELECT a.*, u.name as user_name
             FROM activity_log a
             LEFT JOIN users u ON a.user_id = u.id
             ORDER BY a.created DESC
             LIMIT $[limit]`,
            { limit }
        );
    }

    async getUserStats(days: number = 30): Promise<UserActivityStats[]> {
        return this.db.manyOrNone(
            `SELECT
                u.id as user_id,
                u.name as user_name,
                COUNT(a.id) FILTER (WHERE a.action = '${LeadAction.VERIFIED}') as verified,
                COUNT(a.id) FILTER (WHERE a.action = '${LeadAction.SENT}') as sent,
                COUNT(a.id) FILTER (WHERE a.action = '${LeadAction.TRASHED}') as deleted
             FROM users u
             LEFT JOIN activity_log a
               ON a.user_id = u.id
              AND a.created >= NOW() - ($[days] * INTERVAL '1 day')
             GROUP BY u.id, u.name
             ORDER BY verified DESC NULLS LAST`,
            { days }
        );
    }
}
