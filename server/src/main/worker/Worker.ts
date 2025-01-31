import { CronJob } from 'cron';
import JobService from '../services/jobService';
import { container, injectable } from 'tsyringe';
import SendLeadsJob from './jobs/SendLeadsJob';
import { Job } from "../types/jobTypes";
import { isValidCronFormat, translateCronExpression } from "./util/workerInitializeHelpers.ts";
import moment from 'moment';
import SettingsService from "../services/settingsService.ts";

interface JobHandler {
    execute: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobHandlerConstructor = new (...args: any[]) => JobHandler;

@injectable()
export class Worker {
    private cronJob: CronJob | null = null;
    private readonly handlers: Record<string, JobHandlerConstructor> = {
        'sendLeads': SendLeadsJob
    };

    constructor(
        private readonly jobService: JobService,
        private readonly workerSettingsService: SettingsService
    ) {}

    public initialize = async (): Promise<void> => {
        const cronSchedule = process.env.USE_WORKER_CRON;
        const workerId = await this.jobService.getWorkerId();
        const currentSettings = await this.workerSettingsService.getWorkerSettings();

        if (!workerId) {
            console.error('Error: Worker ID not found. worker must have an user in the DB to record its ID');
            throw new Error('Worker ID not found');
        }

        if (!currentSettings) {
            console.error('Error: Worker settings not found. Worker settings must be initialized');
            throw new Error('Worker settings not found');
        }

        if (cronSchedule) {
            if (isValidCronFormat(cronSchedule)) {
                const humanReadableSchedule = translateCronExpression(cronSchedule);
                console.log(`Using provided cron schedule: ${cronSchedule} (${humanReadableSchedule})`);
            } else {
                console.error('Error: Invalid cron format provided in USE_WORKER_CRON');
                throw new Error('Invalid cron format provided in USE_WORKER_CRON');
            }
        } else {
            console.error('Error: No cron schedule provided in USE_WORKER_CRON');
            throw new Error('No cron schedule provided in USE_WORKER_CRON');
        }

        this.cronJob = new CronJob(
            cronSchedule,
            () => {
                const humanReadableTime = moment().format('YYYY-MM-DD HH:mm:ss');
                const humanReadableSchedule = translateCronExpression(cronSchedule);
                console.log(`[${humanReadableTime}] Cron job executed (Schedule: ${cronSchedule}, ${humanReadableSchedule})`);
                this.checkAndRunJobs();
                this.workerSettingsService.updateLastWorkerRun(currentSettings.id);
            },
            null,
            true
        );

        console.log('Worker initialized successfully');
    };

    public checkAndRunJobs = async (): Promise<void> => {
        try {
            console.log('Checking jobs');
            const pendingJobs = await this.jobService.getAllJobs();
            for (const job of pendingJobs) {
                console.log(`Checking job ${job.name}`);
                await this.executeJob(job);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error checking jobs:', error.message);
            } else {
                console.error('Error checking jobs:', error);
            }
        }
    };

    public executeJob = async (job: Job): Promise<void> => {
        try {
            const HandlerClass = this.handlers[job.name];
            const isTimeToRun = await this.jobService.isTimeToRun(job);
            const isJobPaused = job.is_paused;

            if (isJobPaused) {
                console.log(`Job ${job.name} is paused`);
                return;
            }

            if (!isTimeToRun) {
                console.log(`Job ${job.name} is not due to run`);
                return;
            }

            if (HandlerClass) {
                const handler = container.resolve(HandlerClass);
                await handler.execute();
                await this.jobService.markJobComplete(job.id);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`Error executing job ${job.name}:`, error.message);
            } else {
                console.error(`Error executing job ${job.name}:`, error);
            }
        }
    };

    public stop = (): void => {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('Worker stopped');
        }
    };
}