import express, { Request, Response, Router } from "express";
import { injectable } from "tsyringe";
import VendorReceiveService from "../services/vendorReceiveService";

@injectable()
export default class VendorReceiveResource {
    private readonly router: Router;

    constructor(private readonly service: VendorReceiveService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/", async (req: Request, res: Response) => {
            try {
                const result = await this.service.receive(req.body);
                return res.status(201).send(result);
            } catch (err: any) {
                console.error("Error saving vendor lead:", err);
                return res.status(500).send({ message: "Internal error", error: err?.message });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}