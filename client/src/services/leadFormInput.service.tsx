import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { LeadFormInput, LeadFormInputCreate, LeadFormInputUpdate } from "../types/leadFormInputTypes";

class LeadFormInputService {
    constructor(private readonly api: AxiosProvider) {}

    // Get form input for a lead
    async getByLeadId(leadId: string): Promise<LeadFormInput> {
        const response = await this.api.getApi().get(`/api/leads-form-input/admin/get-by-lead-id/${leadId}`);
        return response.data;
    }

    // Create form input for a lead
    async create(data: LeadFormInputCreate): Promise<LeadFormInput> {
        const response = await this.api.getApi().post(`/api/leads-form-input/admin/create`, data);
        return response.data;
    }

    // Update form input for a lead
    async update(leadId: string, updates: LeadFormInputUpdate): Promise<LeadFormInput> {
        const response = await this.api.getApi().patch(`/api/leads-form-input/admin/update/${leadId}`, updates);
        return response.data;
    }

    // Delete form input for a lead
    async delete(leadId: string): Promise<void> {
        await this.api.getApi().delete(`/api/leads/admin/form-input/${leadId}`);
    }
}

const leadFormInputService = new LeadFormInputService(authProvider);
export default leadFormInputService;