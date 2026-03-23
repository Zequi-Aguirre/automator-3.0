import { CronJob } from "cron";
import JobService from "../services/jobService";
import { container, injectable } from "tsyringe";
import SendLeadsJob from "./jobs/SendLeadsJob";
import { Job } from "../types/jobTypes";
import {
    isValidCronFormat,
    translateCronExpression
} from "./util/workerInitializeHelpers.ts";
import moment from "moment";
import SettingsService from "../services/settingsService.ts";
import TrashExpireLeadsJob from "./jobs/TrashExpireLeadsJob.ts";
import PlatformSyncJob from "./jobs/PlatformSyncJob.ts";

interface JobHandler {
    execute: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobHandlerConstructor = new (...args: any[]) => JobHandler;

@injectable()
export class Worker {
    private cronJob: CronJob | null = null;

    private readonly handlers: Record<string, JobHandlerConstructor> = {
        sendLeads: SendLeadsJob,
        trashExpireLeads: TrashExpireLeadsJob,
        platformSync: PlatformSyncJob,
    };

    constructor(
        private readonly jobService: JobService,
        private readonly workerSettingsService: SettingsService
    ) {}

    public initialize = async (): Promise<void> => {
        const currentSettings =
            await this.workerSettingsService.getWorkerSettings();

        if (!currentSettings) {
            console.error(
                "Error: Worker settings not found. Worker settings must be initialized"
            );
            throw new Error("Worker settings not found");
        }

        const { cron_schedule, worker_enabled } = currentSettings;

        if (!worker_enabled) {
            console.log("Worker is disabled in settings. Skipping initialization.");
            return;
        }

        if (!cron_schedule) {
            console.error(
                "Error: No cron schedule found in worker settings (cron_schedule)"
            );
            throw new Error("No cron schedule found in worker settings");
        }

        if (!isValidCronFormat(cron_schedule)) {
            console.error(
                `Error: Invalid cron format in settings: ${cron_schedule}`
            );
            throw new Error("Invalid cron format provided in settings");
        }

        const humanReadableSchedule =
            translateCronExpression(cron_schedule);

        console.log(
            `Worker cron schedule from DB: ${cron_schedule} (${humanReadableSchedule})`
        );

        // If a cron job already exists (restart), stop it first
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }

        this.cronJob = new CronJob(
            cron_schedule,
            async () => {
                const humanReadableTime =
                    moment().format("YYYY-MM-DD HH:mm:ss");

                console.log(
                    `[${humanReadableTime}] Cron job executed (Schedule: ${cron_schedule}, ${humanReadableSchedule})`
                );

                // trash expired leads on initialization run
                await this.checkAndRunJobs();
                await this.workerSettingsService.updateLastWorkerRun(
                    currentSettings.id
                );
            },
            null,
            true
        );

        console.log("Worker initialized successfully");
    };

    public restartIfScheduleChanged = async (): Promise<void> => {
        const currentSettings =
            await this.workerSettingsService.getWorkerSettings();

        if (!currentSettings) {
            console.error("Worker settings missing during restart check");
            return;
        }

        if (!currentSettings.worker_enabled) {
            this.stop();
            return;
        }

        const newSchedule = currentSettings.cron_schedule;
        if (!newSchedule) {
            console.error("cron_schedule missing during restart check");
            this.stop();
            return;
        }

        if (!isValidCronFormat(newSchedule)) {
            console.error(`Invalid cron_schedule in DB: ${newSchedule}`);
            this.stop();
            return;
        }

        const activeSchedule =
            this.cronJob ? (this.cronJob.cronTime.source as string) : null;

        if (activeSchedule !== newSchedule) {
            console.log(
                `Cron schedule changed from ${activeSchedule} to ${newSchedule}. Restarting worker.`
            );
            await this.initialize();
        }
    };

    public checkAndRunJobs = async (): Promise<void> => {
        try {
            console.log("Checking jobs");
            const pendingJobs = await this.jobService.getAllJobs();

            for (const job of pendingJobs) {
                console.log(`Checking job ${job.name}`);
                await this.executeJob(job);
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error("Error checking jobs:", error.message);
            } else {
                console.error("Error checking jobs:", error);
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
                console.error(
                    `Error executing job ${job.name}:`,
                    error.message
                );
            } else {
                console.error(
                    `Error executing job ${job.name}:`,
                    error
                );
            }
        }
    };

    public stop = (): void => {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log("Worker stopped");
        }
    };

    public isRunning = (): boolean => {
        return this.cronJob !== null;
    };
}