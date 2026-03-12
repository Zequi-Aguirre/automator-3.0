import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import SettingsService from "../services/settingsService.ts";
import ActivityService from "../services/activityService";

@injectable()
export default class SettingsResource {
    private readonly router: Router;

    constructor(
        private readonly settingsService: SettingsService,
        private readonly activityService: ActivityService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Get current settings
        this.router.get("/worker-settings", async (_req: Request, res: Response) => {
            const settings = await this.settingsService.getWorkerSettings();
            res.status(200).send(settings);
        });

        // Update settings
        this.router.patch("/admin/update", async (req: Request, res: Response) => {
            const updatedSettings = await this.settingsService.updateSettings(req.body);
            await this.activityService.log({
                user_id: req.user?.id,
                action: 'worker_settings_updated',
                action_details: req.body
            });
            res.status(200).send(updatedSettings);
        });
    }

    public routes(): Router {
        return this.router;
    }
}