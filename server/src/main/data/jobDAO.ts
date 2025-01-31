import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { IClient } from "pg-promise/typescript/pg-subset";
import { Job } from "../types/jobTypes.ts";

type CreateJobDTO = Pick<Job, 'name' | 'description' | 'interval_minutes'>;
type UpdateJobDTO = Partial<Pick<Job, 'name' | 'description' | 'interval_minutes' | 'is_paused'>>;

@injectable()
export default class JobDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    // Create a new job
    async createJob(job: CreateJobDTO): Promise<Job> {
        const query = `
            INSERT INTO jobs (
                name,
                description,
                interval_minutes
            ) VALUES (
                $(name),
                $(description),
                $(interval_minutes)
            )
            RETURNING *;
        `;

        return await this.db.one<Job>(query, job);
    }

    // Update a job
    async updateJob(id: string, updates: UpdateJobDTO): Promise<Job> {
        if (!id) {
            throw new Error("Job ID is required");
        }

        // Dynamically construct the SET clause
        const setClause = Object.keys(updates)
            .map((key) => `${key} = $(${key})`)
            .join(", ");

        const query = `
            UPDATE jobs
            SET 
                ${setClause},
                updated = NOW()
            WHERE id = $(id)
            AND deleted IS NULL
            RETURNING *;
        `;

        const params = { ...updates, id };
        const result = await this.db.oneOrNone<Job>(query, params);

        if (!result) {
            throw new Error("Job not found or update failed");
        }

        return result;
    }

    // Update last_run timestamp
    async updateLastRun(id: string): Promise<Job> {
        const query = `
            UPDATE jobs
            SET 
                last_run = NOW(),
                updated = NOW()
            WHERE id = $(id)
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Job>(query, { id });

        if (!result) {
            throw new Error("Job not found or update failed");
        }

        return result;
    }

    // Get job by ID
    async getById(id: string): Promise<Job | null> {
        const query = `
            SELECT *
            FROM jobs
            WHERE id = $(id)
            AND deleted IS NULL;
        `;

        return await this.db.oneOrNone<Job>(query, { id });
    }

    // Get all jobs
    async getAll(): Promise<Job[]> {
        const query = `
            SELECT *
            FROM jobs
            WHERE deleted IS NULL
            ORDER BY created DESC;
        `;

        return await this.db.manyOrNone<Job>(query);
    }

    // Pause a job
    async pauseJob(id: string): Promise<Job> {
        const query = `
            UPDATE jobs
            SET 
                is_paused = true,
                updated = NOW()
            WHERE id = $(id)
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Job>(query, { id });

        if (!result) {
            throw new Error("Job not found or pause failed");
        }

        return result;
    }

    // Resume a job
    async resumeJob(id: string): Promise<Job> {
        const query = `
            UPDATE jobs
            SET 
                is_paused = false,
                updated = NOW()
            WHERE id = $(id)
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Job>(query, { id });

        if (!result) {
            throw new Error("Job not found or resume failed");
        }

        return result;
    }

    // Soft delete a job
    async deleteJob(id: string): Promise<Job> {
        const query = `
            UPDATE jobs
            SET deleted = NOW()
            WHERE id = $(id)
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Job>(query, { id });

        if (!result) {
            throw new Error("Job not found or delete failed");
        }

        return result;
    }

    async getWorkerId(): Promise<string> {
        console.log('Getting worker ID');
        // delay for 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // console log // TODO AU2-61 get worker id from the DB
        console.log('hardcoded worker id used');
        console.log('// TODO AU2-61 get worker id from the DB');
        return '123e4567-e89b-12d3-b456-226600000104';
    }
}