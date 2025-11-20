import express, { Request, Response, Router } from "express";
import { injectable } from "tsyringe";
import WorkerService from "../services/workerService";

@injectable()
export default class WorkerResource {
    private readonly router: Router;

    constructor(
        private readonly workerService: WorkerService
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
    }

    public routes(): Router {
        return this.router;
    }
}