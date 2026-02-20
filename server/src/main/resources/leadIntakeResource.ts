import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';
import { ApiLeadPayload } from '../types/leadTypes';

const REQUIRED_FIELDS: (keyof ApiLeadPayload)[] = ['address', 'city', 'state', 'county'];

@injectable()
export default class LeadIntakeResource {
    private readonly router: Router;

    constructor(private readonly leadService: LeadService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/", async (req: Request, res: Response) => {
            try {
                const body = req.body;

                if (!Array.isArray(body) || body.length === 0) {
                    return res.status(400).json({
                        message: "Request body must be a non-empty array of lead objects"
                    });
                }

                // Validate required fields on each payload
                const validationErrors: string[] = [];
                for (let i = 0; i < body.length; i++) {
                    const item = body[i];
                    const missing = REQUIRED_FIELDS.filter(f => !item[f] || String(item[f]).trim() === "");
                    if (missing.length > 0) {
                        validationErrors.push(`Item ${i}: missing required fields: ${missing.join(", ")}`);
                    }
                }

                if (validationErrors.length > 0) {
                    return res.status(400).json({
                        message: "Validation failed",
                        errors: validationErrors
                    });
                }

                const result = await this.leadService.importLeadsFromApi(body as ApiLeadPayload[]);
                return res.status(200).json(result);
            } catch (error) {
                console.error("Error handling lead intake:", error);
                return res.status(500).json({
                    message: "Failed to process lead intake",
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
