import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { DBContainer } from "../config/DBContainer";
import { IClient } from "pg-promise/typescript/pg-subset";
import {
    WorkerSettings,
    WorkerSettingsUpdateAllowedFieldsType
} from "../types/settingsTypes";

type CreateWorkerSettingsDTO = Pick<
    WorkerSettings,
    "name" |
    "business_hours_start" |
    "business_hours_end" |
    "cron_schedule" |
    "worker_enabled"
>;

@injectable()
export default class WorkerSettingsDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async createSettings(settings: CreateWorkerSettingsDTO): Promise<WorkerSettings> {
        const query = `
            INSERT INTO worker_settings (
                name,
                business_hours_start,
                business_hours_end,
                cron_schedule,
                worker_enabled
            ) VALUES (
                $[name],
                $[business_hours_start],
                $[business_hours_end],
                $[cron_schedule],
                $[worker_enabled]
            )
            RETURNING *;
        `;

        const params = {
            name: settings.name,
            business_hours_start: settings.business_hours_start,
            business_hours_end: settings.business_hours_end,
            cron_schedule: settings.cron_schedule ?? "* * * * *",
            worker_enabled: settings.worker_enabled ?? false
        };

        return await this.db.one<WorkerSettings>(query, params);
    }

    async getCurrentSettings(): Promise<WorkerSettings> {
        try {
            const query = `
                SELECT *
                FROM worker_settings
                WHERE deleted IS NULL
                ORDER BY created DESC
                LIMIT 1;
            `;

            return await this.db.one<WorkerSettings>(query);
        } catch {
            throw new Error("Settings not found");
        }
    }

    async updateSettings(
        updates: Partial<WorkerSettingsUpdateAllowedFieldsType>
    ): Promise<WorkerSettings> {
        const updatedFields = await this.getUpdatedSettingsFields(updates);

        const query = `
            UPDATE worker_settings
            SET
                name = $[name],
                send_next_lead_at = $[send_next_lead_at],
                minutes_range_start = $[minutes_range_start],
                minutes_range_end = $[minutes_range_end],
                business_hours_start = $[business_hours_start],
                business_hours_end = $[business_hours_end],
                delay_same_state = $[delay_same_state],
                delay_same_investor = $[delay_same_investor],
                delay_same_county = $[delay_same_county],
                states_on_hold = ARRAY[$[states_on_hold:csv]]::us_state[],
                cron_schedule = $[cron_schedule],
                worker_enabled = $[worker_enabled],
                expire_after_hours = $[expire_after_hours],
                modified = NOW()
            WHERE deleted IS NULL
            RETURNING *;
        `;

        const params = { ...updatedFields };

        const result = await this.db.oneOrNone<WorkerSettings>(query, params);
        if (!result) {
            throw new Error("Settings not found or update failed");
        }

        return result;
    }

    private async getUpdatedSettingsFields(
        updates: Partial<WorkerSettingsUpdateAllowedFieldsType>
    ): Promise<WorkerSettingsUpdateAllowedFieldsType> {
        const existingSettings = await this.getCurrentSettings();
        if (!existingSettings) {
            throw new Error("Settings not found");
        }

        return {
            name: updates.name ?? existingSettings.name,
            business_hours_start: updates.business_hours_start ?? existingSettings.business_hours_start,
            business_hours_end: updates.business_hours_end ?? existingSettings.business_hours_end,
            cron_schedule: updates.cron_schedule ?? existingSettings.cron_schedule,
            worker_enabled: updates.worker_enabled ?? existingSettings.worker_enabled,
            expire_after_hours: updates.expire_after_hours ?? existingSettings.expire_after_hours,
            enforce_expiration: updates.enforce_expiration ?? existingSettings.enforce_expiration
        };
    }

    async updateLastWorkerRun(id: string): Promise<WorkerSettings> {
        const query = `
            UPDATE worker_settings
            SET 
                last_worker_run = NOW(),
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<WorkerSettings>(query, { id });

        if (!result) {
            throw new Error("Settings not found or update failed");
        }

        return result;
    }

    async updateNextLeadTime(
        id: string,
        nextLeadTime: string
    ): Promise<WorkerSettings> {
        const query = `
            UPDATE worker_settings
            SET 
                send_next_lead_at = $[nextLeadTime],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<WorkerSettings>(
            query,
            { id, nextLeadTime }
        );

        if (!result) {
            throw new Error("Settings not found or update failed");
        }

        return result;
    }
}