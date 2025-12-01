import express, { Request, Response, Router } from "express";
import { injectable } from "tsyringe";
import WorkerService from "../services/workerService";
import SettingsService from "../services/settingsService";
import { Worker } from "../worker/Worker";

@injectable()
export default class WorkerResource {
    private readonly router: Router;

    constructor(
        private readonly workerService: WorkerService,
        private readonly settingsService: SettingsService,
        private readonly worker: Worker
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {

        // Force-send a specific lead manually
        this.router.patch(
            "/admin/send-now/:leadId",
            async (req: Request, res: Response) => {
                try {
                    const { leadId } = req.params;
                    if (!leadId) {
                        res.status(400).send({ success: false, message: "Missing leadId" });
                        return;
                    }

                    const result = await this.workerService.forceSendLead(leadId);

                    res.status(200).send({
                        success: true,
                        message: `Lead ${leadId} sent successfully`,
                        lead: result
                    });

                } catch (err: any) {
                    res.status(500).send({
                        success: false,
                        message: err instanceof Error ? err.message : "Unknown error"
                    });
                }
            }
        );

        // Start worker (enable in DB, then initialize cron)
        this.router.patch(
            "/admin/start",
            async (_req: Request, res: Response) => {
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
            async (_req: Request, res: Response) => {
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