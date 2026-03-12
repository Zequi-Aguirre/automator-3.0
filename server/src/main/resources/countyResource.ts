// resources/countyResource.ts
import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import CountyService from "../services/countyService.ts";
import ActivityService from "../services/activityService";
import { CountyAction, EntityType } from "../types/activityTypes";
import multer from "multer";

const upload = multer(); // memory storage by default

@injectable()
export default class CountyResource {
    private readonly router: Router;

    constructor(
        private readonly countyService: CountyService,
        private readonly activityService: ActivityService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/admin/get-all", async (_req: Request, res: Response) => {
            const counties = await this.countyService.getAll();
            res.status(200).send(counties);
        });

        this.router.get("/admin/get-many", async (req: Request, res: Response) => {
            const filters = {
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 100,
                search: (req.query.search as string) || "",
                status: (req.query.status as "all" | "active" | "blacklisted") || "all"
            };

            const result = await this.countyService.getMany(filters);
            res.status(200).send(result);
        });

        // TICKET-047: Get county by ID
        this.router.get("/admin/:countyId", async (req: Request, res: Response) => {
            try {
                const { countyId } = req.params;
                const county = await this.countyService.getById(countyId);

                if (!county) {
                    return res.status(404).send({ message: "County not found" });
                }

                res.status(200).send(county);
            } catch (error) {
                console.error("Error fetching county:", error);
                res.status(500).send({
                    message: "Failed to fetch county",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });

        // TICKET-047: Update county (including zip_codes)
        this.router.patch("/admin/:countyId", async (req: Request, res: Response) => {
            try {
                const { countyId } = req.params;
                const updates = req.body;

                const updated = await this.countyService.updateCounty(countyId, updates);
                await this.activityService.log({
                    user_id: req.user?.id,
                    entity_type: EntityType.COUNTY,
                    entity_id: countyId,
                    action: CountyAction.UPDATED,
                    action_details: updates
                });
                res.status(200).send(updated);
            } catch (error) {
                console.error("Error updating county:", error);
                res.status(500).send({
                    message: "Failed to update county",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });

        this.router.patch("/admin/blacklist/:countyId", async (req: Request, res: Response) => {
            const { countyId } = req.params;
            const { blacklisted } = req.body;
            const updated = await this.countyService.updateCountyBlacklistStatus(countyId, blacklisted);
            await this.activityService.log({
                user_id: req.user?.id,
                entity_type: EntityType.COUNTY,
                entity_id: countyId,
                action: CountyAction.UPDATED,
                action_details: { blacklisted }
            });
            res.status(200).send(updated);
        });

        this.router.post("/admin/import", upload.single("file"), async (req: Request, res: Response) => {
                try {
                    if (!req.file) {
                        return res.status(400).send({ message: "No file uploaded" });
                    }

                    const csvContent = req.file.buffer.toString("utf8");
                    const result = await this.countyService.importCounties(csvContent);

                    console.log(`Imported ${result.imported} counties, Rejected: ${result.rejected}`);
                    return res.status(200).send(result);
                } catch (error) {
                    console.error("Error handling counties import:", error);
                    return res.status(500).send({
                        message: "Failed to import counties",
                        error: error instanceof Error ? error.message : "Unknown error",
                    });
                }
            }
        );
    }

    public routes(): Router {
        return this.router;
    }
}