import { injectable, container } from "tsyringe";
import JobDAO from '../data/jobDAO';
import { Job } from "../types/jobTypes.ts";
import SendLeadsJob from '../worker/jobs/SendLeadsJob';

interface JobHandler {
    execute: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobHandlerConstructor = new (...args: any[]) => JobHandler;

@injectable()
export default class JobService {
    private readonly handlers: Record<string, JobHandlerConstructor> = {
        'sendLeads': SendLeadsJob,
        // Add other job handlers here as needed
    };

    constructor(
        private readonly jobDAO: JobDAO
    ) {}

    async createJob(
        name: string,
        intervalMinutes: number,
        description?: string
    ): Promise<Job> {
        if (!this.handlers[name]) {
            throw new Error(`Invalid job type: ${name}`);
        }

        return this.jobDAO.createJob({
            name,
            interval_minutes: intervalMinutes,
            description: description || null
        });
    }

    async updateJob(
        jobId: string,
        updates: {
            name?: string;
            description?: string;
            interval_minutes?: number;
            is_paused?: boolean;
        }
    ): Promise<Job> {
        if (updates.name && !this.handlers[updates.name]) {
            throw new Error(`Invalid job type: ${updates.name}`);
        }

        return this.jobDAO.updateJob(jobId, updates);
    }

    async runJob(jobId: string): Promise<Job> {
        // Get the job
        const job = await this.jobDAO.getById(jobId);
        if (!job) {
            throw new Error(`Job with id ${jobId} not found`);
        }

        // Check if job is paused
        if (job.is_paused) {
            throw new Error(`Cannot run job ${job.name} because it is paused`);
        }

        // Get the handler
        const HandlerClass = this.handlers[job.name];
        if (!HandlerClass) {
            throw new Error(`No handler found for job type: ${job.name}`);
        }

        try {
            console.log(`Admin requested to run job: ${job.name}`);
            console.log(`Starting execution`);
            // Create and execute the handler
            const handler = container.resolve<JobHandler>(HandlerClass);
            handler.execute();

            // Mark the job as complete and get the updated job
            const updatedJob = await this.jobDAO.updateLastRun(job.id);

            console.log(`Job completed successfully: ${job.name}`);
            return updatedJob;
        } catch (error) {
            console.error(`Error executing job ${job.name}:`, error);

            // You might want to update the job with error information here
            // await this.jobDAO.updateJobError(job.id, error.message);

            throw new Error(`Failed to execute job ${job.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getWorkerId(): Promise<string> {
        return this.jobDAO.getWorkerId();
    }

    async getJob(jobId: string): Promise<Job | null> {
        return this.jobDAO.getById(jobId);
    }

    async getAllJobs(): Promise<Job[]> {
        return this.jobDAO.getAll();
    }

    async markJobComplete(jobId: string): Promise<Job> {
        return this.jobDAO.updateLastRun(jobId);
    }

    async pauseJob(jobId: string): Promise<Job> {
        return this.jobDAO.pauseJob(jobId);
    }

    async resumeJob(jobId: string): Promise<Job> {
        return this.jobDAO.resumeJob(jobId);
    }

    async deleteJob(jobId: string): Promise<Job> {
        return this.jobDAO.deleteJob(jobId);
    }

    async isTimeToRun(job: Job): Promise<boolean> {
        const lastRun = job.last_run || new Date(0);
        const intervalWithBuffer = job.interval_minutes * 60000 - 30000;
        const nextRun = new Date(lastRun.getTime() + intervalWithBuffer);
        return nextRun <= new Date();
    }

    getAvailableJobTypes(): string[] {
        return Object.keys(this.handlers);
    }
}