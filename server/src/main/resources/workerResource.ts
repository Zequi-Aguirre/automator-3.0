import express, { Request, Response, Router } from "express";
import { injectable } from "tsyringe";
import SettingsService from "../services/settingsService";
import ActivityService from "../services/activityService";
import { WorkerAction } from "../types/activityTypes";
import { Worker } from "../worker/Worker";
import { requirePermission } from '../middleware/requirePermission';
import { Permission } from '../types/permissionTypes';

@injectable()
export default class WorkerResource {
    private readonly router: Router;

    constructor(
        private readonly settingsService: SettingsService,
        private readonly worker: Worker,
        private readonly activityService: ActivityService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {

        // REMOVED: Force-send endpoint (forceSendLead method removed in Sprint 4 refactor)
        // Old endpoint: PATCH /admin/send-now/:leadId
        // Reason: New architecture processes buyers, not individual leads
        // Alternative: Use buyer send modal to send lead to specific buyer

        // Start worker (enable in DB, then initialize cron)
        this.router.patch(
            "/admin/start",
            requirePermission(Permission.WORKER_TOGGLE),
            async (req: Request, res: Response) => {
                try {
                    const settings = await this.settingsService.getWorkerSettings();
                    if (!settings) {
                        res.status(404).send({ success: false, message: "Worker settings not found" });
                        return;
                    }

                    await this.settingsService.updateSettings({
                        id: settings.id,
                        worker_enabled: true
                    });

                    await this.worker.initialize();
                    await this.activityService.log({ user_id: req.user?.id, action: WorkerAction.STARTED });

                    res.status(200).send({
                        success: true,
                        message: "Worker started"
                    });

                } catch (err: any) {
                    res.status(500).send({
                        success: false,
                        message: err instanceof Error ? err.message : "Unknown error"
                    });
                }
            }
        );

        // Stop worker (disable in DB, stop cron)
        this.router.patch(
            "/admin/stop",
            requirePermission(Permission.WORKER_TOGGLE),
            async (req: Request, res: Response) => {
                try {
                    const settings = await this.settingsService.getWorkerSettings();
                    if (!settings) {
                        res.status(404).send({ success: false, message: "Worker settings not found" });
                        return;
                    }

                    await this.settingsService.updateSettings({
                        id: settings.id,
                        worker_enabled: false
                    });

                    this.worker.stop();
                    await this.activityService.log({ user_id: req.user?.id, action: WorkerAction.STOPPED });

                    res.status(200).send({
                        success: true,
                        message: "Worker stopped"
                    });

                } catch (err: any) {
                    res.status(500).send({
                        success: false,
                        message: err instanceof Error ? err.message : "Unknown error"
                    });
                }
            }
        );

        // Get worker status from DB + runtime
        this.router.get(
            "/admin/status",
            async (_req: Request, res: Response) => {
                try {
                    const settings = await this.settingsService.getWorkerSettings();
                    if (!settings) {
                        res.status(404).send({ success: false, message: "Worker settings not found" });
                        return;
                    }

                    res.status(200).send({
                        success: true,
                        worker_enabled: settings.worker_enabled,
                        cron_schedule: settings.cron_schedule,
                        running: this.worker.isRunning()
                    });

                } catch (err: any) {
                    res.status(500).send({
                        success: false,
                        message: err instanceof Error ? err.message : "Unknown error"
                    });
                }
            }
        );

        // Update cron schedule in DB, restart worker if enabled
        this.router.patch(
            "/admin/update-cron",
            async (req: Request, res: Response) => {
                try {
                    const { cron_schedule } = req.body;

                    if (!cron_schedule || typeof cron_schedule !== "string") {
                        res.status(400).send({
                            success: false,
                            message: "cron_schedule is required"
                        });
                        return;
                    }

                    const settings = await this.settingsService.getWorkerSettings();
                    if (!settings) {
                        res.status(404).send({ success: false, message: "Worker settings not found" });
                        return;
                    }

                    const updated = await this.settingsService.updateSettings({
                        id: settings.id,
                        cron_schedule
                    });

                    if (updated.worker_enabled) {
                        await this.worker.initialize();
                    }

                    res.status(200).send({
                        success: true,
                        message: "Cron schedule updated",
                        cron_schedule: updated.cron_schedule
                    });

                } catch (err: any) {
                    res.status(500).send({
                        success: false,
                        message: err instanceof Error ? err.message : "Unknown error"
                    });
                }
            }
        );
    }

    public routes(): Router {
        return this.router;
    }
}