import { injectable } from "tsyringe";
import LeadManagerDAO from "../data/leadManagerDAO";
import { LeadManager, LeadManagerCreateDTO, LeadManagerUpdateDTO, LeadManagerFilters } from "../types/leadManagerTypes";
import { Source } from "../types/sourceTypes";

@injectable()
export default class LeadManagerService {
    constructor(private readonly leadManagerDAO: LeadManagerDAO) {}

    async getById(id: string): Promise<LeadManager | null> {
        return this.leadManagerDAO.getById(id);
    }

    async getAll(filters: LeadManagerFilters): Promise<{ items: LeadManager[]; count: number }> {
        return this.leadManagerDAO.getAll(filters);
    }

    async getActive(): Promise<LeadManager[]> {
        return this.leadManagerDAO.getActive();
    }

    async create(data: LeadManagerCreateDTO): Promise<LeadManager> {
        if (!data.name || data.name.trim().length === 0) {
            throw new Error('Manager name is required');
        }
        return this.leadManagerDAO.create(data);
    }

    async update(id: string, data: LeadManagerUpdateDTO): Promise<LeadManager> {
        const existing = await this.leadManagerDAO.getById(id);
        if (!existing) throw new Error(`Lead manager not found: ${id}`);
        return this.leadManagerDAO.update(id, data);
    }

    async trash(id: string): Promise<LeadManager> {
        const existing = await this.leadManagerDAO.getById(id);
        if (!existing) throw new Error(`Lead manager not found: ${id}`);
        return this.leadManagerDAO.trash(id);
    }

    async getSourcesByManager(managerId: string): Promise<(Source & { campaign_count: number })[]> {
        return this.leadManagerDAO.getSourcesByManagerId(managerId);
    }
}
