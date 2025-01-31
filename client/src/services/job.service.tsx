import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Job } from "../types/jobTypes";

class JobService {
    constructor(private readonly api: AxiosProvider) {}

    // Get all jobs
    async getAll(): Promise<Job[]> {
        const response = await this.api.getApi().get('/api/jobs/admin/');
        return response.data;
    }

    // Get many jobs with pagination
    async getMany(filters: { page: number, limit: number }): Promise<{ jobs: Job[], count: number }> {
        const response = await this.api.getApi().get(`/api/jobs/admin/many?page=${filters.page}&limit=${filters.limit}`);
        return response.data;
    }

    // Get job by id
    async getJobById(jobId: string): Promise<Job> {
        const response = await this.api.getApi().get(`/api/jobs/admin/${jobId}`);
        return response.data;
    }

    // Create new job
    async createJob(jobData: {
        name: string,
        interval_minutes: number,
        description?: string
    }): Promise<Job> {
        const response = await this.api.getApi().post('/api/jobs/admin/', jobData);
        return response.data;
    }

    // Update job by id
    async updateJob(jobId: string, jobData: Partial<Job>): Promise<Job> {
        const response = await this.api.getApi().patch(`/api/jobs/admin/${jobId}`, jobData);
        return response.data;
    }

    // Mark job as completed (update last_run)
    async markJobComplete(jobId: string): Promise<Job> {
        const response = await this.api.getApi().patch(`/api/jobs/admin/${jobId}/complete`);
        return response.data;
    }

    // Pause job
    async pauseJob(jobId: string): Promise<Job> {
        const response = await this.api.getApi().post(`/api/jobs/admin/${jobId}/pause`);
        return response.data;
    }

    // Run job
    async runJob(jobId: string): Promise<Job> {
        const response = await this.api.getApi().post(`/api/jobs/admin/${jobId}/run`);
        return response.data;
    }

    // Resume job
    async resumeJob(jobId: string): Promise<Job> {
        const response = await this.api.getApi().post(`/api/jobs/admin/${jobId}/resume`);
        return response.data;
    }

    // Delete job
    async deleteJob(jobId: string): Promise<Job> {
        const response = await this.api.getApi().delete(`/api/jobs/admin/${jobId}`);
        return response.data;
    }

    // Check if it's time to run a job
    async isTimeToRun(jobId: string): Promise<{ shouldRun: boolean, nextRunTime: Date }> {
        const response = await this.api.getApi().get(`/api/jobs/admin/${jobId}/check-run-time`);
        return response.data;
    }

    // Get job statistics
    async getJobStats(jobId: string): Promise<{
        total_runs: number,
        average_duration: number,
        last_run_status: string,
        last_run_duration: number
    }> {
        const response = await this.api.getApi().get(`/api/jobs/admin/${jobId}/stats`);
        return response.data;
    }
}

const jobService = new JobService(authProvider);

export default jobService;