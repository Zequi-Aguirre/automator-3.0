import { injectable } from "tsyringe";
import LeadFormInputDAO from "../data/leadFormInputDAO";
import { LeadFormInputCreate, LeadFormInputUpdate, LeadFormInput } from "../types/leadFormInputTypes";

@injectable()
export default class LeadFormInputService {
    constructor(private readonly leadFormInputDAO: LeadFormInputDAO) {}

    async getByLeadId(leadId: string): Promise<LeadFormInput | null> {
        if (!leadId) {
            throw new Error("Lead ID is required");
        }

        return await this.leadFormInputDAO.getByLeadId(leadId);
    }

    async create(formData: LeadFormInputCreate): Promise<LeadFormInput> {
        return await this.leadFormInputDAO.create(formData);
    }

    async update(leadId: string, updates: LeadFormInputUpdate): Promise<LeadFormInput> {
        if (!leadId) {
            throw new Error("Lead ID is required for update");
        }

        return await this.leadFormInputDAO.update(leadId, updates);
    }

    async delete(leadId: string): Promise<void> {
        await this.leadFormInputDAO.delete(leadId);
    }
}