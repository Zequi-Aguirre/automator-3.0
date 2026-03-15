import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import JobService from '../services/jobService';
import { requirePermission } from '../middleware/requirePermission';
import { WorkerSettingsPermission } from '../types/permissionTypes';

@injectable()
export default class JobResource {
    private readonly router: Router;

    constructor(private readonly jobService: JobService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Get all jobs
        this.router.get("/", requirePermission(WorkerSettingsPermission.MANAGE), async (_req: Request, res: Response) => {
            const jobs = await this.jobService.getAllJobs();
            res.status(200).send(jobs);
        });

        // Get a specific job
        this.router.get("/:jobId", requirePermission(WorkerSettingsPermission.MANAGE), async (req: Request, res: Response) => {
            const jobId = req.params.jobId;
            const job = await this.jobService.getJob(jobId);
            res.status(200).send(job);
        });

        // Create a new job
        this.router.post("/", requirePermission(WorkerSettingsPermission.MANAGE), async (req: Request, res: Response) => {
            const { name, interval_minutes, description } = req.body;
            const job = await this.jobService.createJob(name, interval_minutes, description);
            res.status(201).send(job);
        });

        // Update a job
        this.router.patch("/:jobId", requirePermission(WorkerSettingsPermission.MANAGE), async (req: Request, res: Response) => {
            const jobId = req.params.jobId;
            const updates = req.body;
            const job = await this.jobService.updateJob(jobId, updates);
            res.status(200).send(job);
        });

        // Run a job
        this.router.post("/:jobId/run", requirePermission(WorkerSettingsPermission.MANAGE), async (req: Request, res: Response) => {
            const jobId = req.params.jobId;
            const job = await this.jobService.runJob(jobId);
            console.log(`Job ${job.name} executed`);
            res.status(200).send(job);
        });

        // Pause a job
        this.router.post("/:jobId/pause", requirePermission(WorkerSettingsPermission.MANAGE), async (req: Request, res: Response) => {
            const jobId = req.params.jobId;
            const job = await this.jobService.pauseJob(jobId);
            res.status(200).send(job);
        });

        // Resume a job
        this.router.post("/:jobId/resume", requirePermission(WorkerSettingsPermission.MANAGE), async (req: Request, res: Response) => {
            const jobId = req.params.jobId;
            const job = await this.jobService.resumeJob(jobId);
            res.status(200).send(job);
        });

        // Delete a job
        this.router.delete("/:jobId", requirePermission(WorkerSettingsPermission.MANAGE), async (req: Request, res: Response) => {
            const jobId = req.params.jobId;
            const job = await this.jobService.deleteJob(jobId);
            res.status(200).send(job);
        });
    }

    public routes(): Router {
        return this.router;
    }
}
