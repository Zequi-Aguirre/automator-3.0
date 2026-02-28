import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Lead } from "../types/leadTypes";

class LeadService {
    constructor(private readonly api: AxiosProvider) {}

    // Get many with filters, limit and page
    async getMany(filters: {
        page: number,
        limit: number,
        search?: string,
        status?: "new" | "verified" | "sent" | "trash"
    }): Promise<{ leads: Lead[], count: number }> {
        const response = await this.api.getApi().get(
            '/api/leads/get-many',
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

    // Trash lead by id with oldDatabase support
    async trashLead(
        leadId: string
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/trash/${leadId}`);
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

    // ========================================
    // Buyer Dispatch Methods
    // ========================================

    // Send lead to specific buyer (manual send)
    async sendLeadToBuyer(leadId: string, buyerId: string): Promise<any> {
        const response = await this.api.getApi().post(
            `/api/leads/${leadId}/send-to-buyer`,
            { buyer_id: buyerId }
        );
        return response.data;
    }

    // Get buyer send history for lead
    async getBuyerSendHistory(leadId: string): Promise<{
        buyers: Array<{
            buyer_id: string;
            buyer_name: string;
            buyer_priority: number;
            dispatch_mode: 'manual' | 'worker' | 'both';
            sends: Array<{
                id: string;
                status: string;
                response_code: number | null;
                created: string;
            }>;
            total_sends: number;
            last_sent_at: string | null;
        }>;
    }> {
        const response = await this.api.getApi().get(`/api/leads/${leadId}/buyers`);
        return response.data;
    }

    // Enable worker processing for lead
    async enableWorker(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().post(`/api/leads/${leadId}/enable-worker`);
        return response.data;
    }

    // Mark lead as sold to buyer
    async markSoldToBuyer(
        leadId: string,
        buyerId: string,
        soldPrice?: number
    ): Promise<any> {
        const response = await this.api.getApi().post(
            `/api/leads/${leadId}/buyers/${buyerId}/sold`,
            { sold_price: soldPrice }
        );
        return response.data;
    }
}

const leadsService = new LeadService(authProvider);
export default leadsService;