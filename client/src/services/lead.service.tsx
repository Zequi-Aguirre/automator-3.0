import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Lead } from "../types/leadTypes";

class LeadService {
    constructor(private readonly api: AxiosProvider) {}

    // Get many with filters, limit and page
    async getManyAdmin(filters: {
        page: number,
        limit: number,
        search?: string,
        status?: "new" | "verified" | "sent" | "trash"
    }): Promise<{ leads: Lead[], count: number }> {
        const response = await this.api.getApi().get(
            '/api/leads/admin/get-many',
            { params: filters }
        );
        return response.data;
    }

    async getManyUser(filters: {
        page: number,
        limit: number,
        search?: string,
        status?: "new" | "verified"
    }): Promise<{ leads: Lead[], count: number }> {
        const response = await this.api.getApi().get(
            '/api/leads/user/get-many',
            { params: filters }
        );
        return response.data;
    }

    // Get lead by id
    async getLeadById(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().get(`/api/leads/get/${leadId}`);
        return response.data;
    }

    // Update lead by id with oldDatabase support
    async updateLead(
        leadId: string,
        leadData: Partial<Lead>
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(
            `/api/leads/update/${leadId}`, leadData);
        return response.data;
    }

    // Send lead by id with oldDatabase support
    async sendLead(
        leadId: string
    ): Promise<{ success: boolean; message: string }> {
        const response = await this.api.getApi().patch(`/api/worker/admin/send-now/${leadId}`);
        return response.data;
    }

    // Trash lead by id with oldDatabase support
    async trashLead(
        leadId: string
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/admin/trash/${leadId}`);
        return response.data;
    }

    // Verify lead by id (uses saved form data in backend)
    async verifyLead(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/verify/${leadId}`);
        return response.data;
    }

    // Unverify lead by id
    async unverifyLead(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/unverify/${leadId}`);
        return response.data;
    }

    // 🚀 Import leads from CSV
    async importLeads(formData: FormData): Promise<{
        imported: number;
        rejected?: number;
        errors?: string[];
    }> {
        const response = await this.api.getApi().post(
            '/api/leads-open/import',
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' }
            }
        );
        return response.data;
    }
}

const leadsService = new LeadService(authProvider);
export default leadsService;