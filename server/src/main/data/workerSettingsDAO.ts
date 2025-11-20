import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { IClient } from "pg-promise/typescript/pg-subset";
import { WorkerSettings, WorkerSettingsUpdateAllowedFieldsType } from "../types/settingsTypes";

type CreateWorkerSettingsDTO = Pick<WorkerSettings,
    'name' |
    'business_hours_start' |
    'business_hours_end'
>;

@injectable()
export default class WorkerSettingsDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    // Create worker settings
    async createSettings(settings: CreateWorkerSettingsDTO): Promise<WorkerSettings> {
        const query = `
            INSERT INTO worker_settings (
                name,
                business_hours_start::text,
                business_hours_end::text
               
            ) VALUES (
                $(name),
                $(business_hours_start),
                $(business_hours_end)
            )
            RETURNING *;
        `;

        return await this.db.one<WorkerSettings>(query, settings);
    }

    // Get current worker settings
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
        } catch (error) {
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
        // Fetch the existing Settings from the database
        const existingSettings = await this.getCurrentSettings();
        if (!existingSettings) {
            throw new Error("Settings not found");
        }

        // Combine the updates with the existing settings data
        return {
            name: updates.name ?? existingSettings.name,
            send_next_lead_at: updates.send_next_lead_at ?? existingSettings.send_next_lead_at,
            minutes_range_start: updates.minutes_range_start ?? existingSettings.minutes_range_start,
            minutes_range_end: updates.minutes_range_end ?? existingSettings.minutes_range_end,
            business_hours_start: updates.business_hours_start ?? existingSettings.business_hours_start,
            business_hours_end: updates.business_hours_end ?? existingSettings.business_hours_end,
            delay_same_state: updates.delay_same_state ?? existingSettings.delay_same_state,
            states_on_hold: updates.states_on_hold ?? existingSettings.states_on_hold,
            delay_same_investor: updates.delay_same_investor ?? existingSettings.delay_same_investor,
            delay_same_county: updates.delay_same_county ?? existingSettings.delay_same_county,
        };
    }

    // Specific method to update last worker run
    async updateLastWorkerRun(id: string): Promise<WorkerSettings> {
        const query = `
            UPDATE worker_settings
            SET 
                last_worker_run = NOW(),
                modified = NOW()
            WHERE id = $(id)
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<WorkerSettings>(query, { id });

        if (!result) {
            throw new Error("Settings not found or update failed");
        }

        return result;
    }

    // Specific method to update send_next_lead_at
    async updateNextLeadTime(
        id: string,
        nextLeadTime: string
    ): Promise<WorkerSettings> {
        const query = `
            UPDATE worker_settings
            SET 
                send_next_lead_at = $(nextLeadTime),
                modified = NOW()
            WHERE id = $(id)
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