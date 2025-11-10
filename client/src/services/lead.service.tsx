import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Lead } from "../types/leadTypes";

class LeadService {
    constructor(private readonly api: AxiosProvider) {}

    // Get many with filters, limit and page
    async getMany(filters: {
        page: number,
        limit: number
    }): Promise<{ leads: Lead[], count: number }> {
        const response = await this.api.getApi().get(
            '/api/leads/admin/get-many',
            {
                params: filters
            }
        );
        return response.data;
    }

    // Get lead by id
    async getLeadById(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().get(`/api/leads/admin/get/${leadId}`);
        return response.data;
    }

    // Update lead by id with oldDatabase support
    async updateLead(
        leadId: string,
        leadData: Partial<Lead>
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(
            `/api/leads/admin/update/${leadId}`, leadData);
        return response.data;
    }

    // Send lead by id with oldDatabase support
    async sendLead(
        leadId: string
    ): Promise<{ success: boolean; message: string }> {
        const response = await this.api.getApi().patch(`/api/leads/admin/send/${leadId}`);
        return response.data;
    }

    // Trash lead by id with oldDatabase support
    async trashLead(
        leadId: string
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/admin/trash/${leadId}`);
        return response.data;
    }
}

const leadsService = new LeadService(authProvider);

export default leadsService;