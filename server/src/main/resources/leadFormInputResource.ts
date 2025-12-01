import express, { Request, Response, Router } from "express";
import { injectable } from "tsyringe";
import LeadFormInputService from "../services/leadFormInputService";
import { LeadFormInputCreate, LeadFormInputUpdate } from "../types/leadFormInputTypes";

@injectable()
export default class LeadFormInputResource {
    private readonly router: Router;

    constructor(private readonly leadFormInputService: LeadFormInputService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET: Retrieve form input for a lead
        this.router.get("/get-by-lead-id/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const result = await this.leadFormInputService.getByLeadId(leadId);

                if (!result) {
                    return res.status(404).send({ message: "Form input not found for this lead" });
                }

                return res.status(200).send(result);
            } catch (error) {
                console.error("Error fetching form input:", error);
                return res.status(500).send({
                    message: "Failed to fetch form input",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });

        // POST: Create form input for a lead
        this.router.post("/create", async (req: Request, res: Response) => {
            try {
                const data: LeadFormInputCreate = req.body;
                const result = await this.leadFormInputService.create(data);
                return res.status(201).send(result);
            } catch (error) {
                console.error("Error creating form input:", error);
                return res.status(500).send({
                    message: "Failed to create form input",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });

        // PATCH: Update form input for a lead
        this.router.patch("/update/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                const updates: LeadFormInputUpdate = req.body;

                const updated = await this.leadFormInputService.update(leadId, updates);
                return res.status(200).send(updated);
            } catch (error) {
                console.error("Error updating form input:", error);
                return res.status(500).send({
                    message: "Failed to update form input",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });

        // DELETE: Soft delete form input for a lead
        this.router.delete("/form-input/:leadId", async (req: Request, res: Response) => {
            try {
                const leadId = req.params.leadId;
                await this.leadFormInputService.delete(leadId);
                return res.status(204).send();
            } catch (error) {
                console.error("Error deleting form input:", error);
                return res.status(500).send({
                    message: "Failed to delete form input",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}