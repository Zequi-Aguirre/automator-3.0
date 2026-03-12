import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';
import multer from 'multer';
import { requirePermission } from '../middleware/requirePermission';
import { Permission } from '../types/permissionTypes';

const upload = multer(); // memory storage by default

@injectable()
export default class LeadOpenResource {
    private readonly router: Router;

    constructor(private readonly leadService: LeadService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // CSV import route
        this.router.post("/import", requirePermission(Permission.LEADS_IMPORT), upload.single('file'), async (req: Request, res: Response) => {
            try {
                if (!req.file) {
                    return res.status(400).send({ message: "No file uploaded" });
                }

                const csvContent = req.file.buffer.toString('utf8');
                const result = await this.leadService.importLeads(csvContent, req.user?.id);
                return res.status(200).send(result);
            } catch (error) {
                console.error("Error handling import:", error);
                return res.status(500).send({
                    message: "Failed to process CSV import",
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}