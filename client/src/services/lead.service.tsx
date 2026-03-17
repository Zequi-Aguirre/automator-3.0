import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Lead } from "../types/leadTypes";

class LeadService {
    constructor(private readonly api: AxiosProvider) {}

    // Get many with filters, limit and page
    async getMany(filters: {
        page: number,
        limit: number,
        search?: string,
        status?: "needs_review" | "needs_call" | "new" | "verified" | "sent" | "sold" | "trash",
        // TICKET-066: Sent tab advanced filters
        buyer_id?: string,
        send_source?: "manual" | "worker" | "auto_send",
        source_id?: string,
        campaign_id?: string,
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
        leadId: string,
        reason?: string
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/trash/${leadId}`, reason ? { reason } : {});
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
        rejectedLeads?: Array<Record<string, string>>;
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
    async sendLeadToBuyer(leadId: string, buyerId: string, force: boolean = false): Promise<unknown> {
        const response = await this.api.getApi().post(
            `/api/leads/${leadId}/send-to-buyer`,
            { buyer_id: buyerId, force }
        );
        return response.data;
    }

    // Get buyer send history for lead
    async getBuyerSendHistory(leadId: string): Promise<{
        outside_business_hours: boolean;
        buyers: Array<{
            buyer_id: string;
            buyer_name: string;
            buyer_priority: number;
            manual_send: boolean;
            worker_send: boolean;
            sold: boolean;
            has_successful_send: boolean;
            filter_warnings: string[];
            sends: Array<{
                id: string;
                status: string;
                response_code: number | null;
                created: string;
                disputed: boolean;
                dispute_reason: string | null;
                dispute_buyer_name: string | null;
                disputed_at: string | null;
            }>;
            total_sends: number;
            last_sent_at: string | null;
        }>;
    }> {
        const response = await this.api.getApi().get(`/api/leads/${leadId}/buyers`);
        return response.data;
    }

    // Queue lead for worker
    async queueLead(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().post(`/api/leads/${leadId}/queue`);
        return response.data;
    }

    // Unqueue lead from worker
    async unqueueLead(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().post(`/api/leads/${leadId}/unqueue`);
        return response.data;
    }

    // Mark lead as sold to buyer
    async markSoldToBuyer(
        leadId: string,
        buyerId: string,
        soldPrice?: number
    ): Promise<unknown> {
        const response = await this.api.getApi().post(
            `/api/leads/${leadId}/buyers/${buyerId}/sold`,
            { sold_price: soldPrice }
        );
        return response.data;
    }

    async untrashLead(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/untrash/${leadId}`);
        return response.data;
    }

    async unmarkSoldToBuyer(leadId: string, buyerId: string): Promise<unknown> {
        const response = await this.api.getApi().delete(
            `/api/leads/${leadId}/buyers/${buyerId}/sold`
        );
        return response.data;
    }

    // TICKET-064: Resolve needs_review flag once missing info is filled in
    async resolveNeedsReview(leadId: string): Promise<Lead> {
        const response = await this.api.getApi().patch(`/api/leads/resolve-review/${leadId}`);
        return response.data;
    }

    // TICKET-065: Request a call for a lead
    async requestCall(leadId: string, reason: string, note?: string): Promise<Lead> {
        const response = await this.api.getApi().post(`/api/leads/${leadId}/request-call`, { reason, note: note || undefined });
        return response.data;
    }

    // TICKET-065: Log a call attempt and outcome
    async executeCall(leadId: string, outcome: string, notes?: string): Promise<Lead> {
        const response = await this.api.getApi().post(`/api/leads/${leadId}/execute-call`, { outcome, notes });
        return response.data;
    }

    async getTabCounts(): Promise<{ new: number; verified: number; needs_review: number; needs_call: number }> {
        const response = await this.api.getApi().get('/api/leads/counts');
        return response.data;
    }
}

const leadsService = new LeadService(authProvider);
export default leadsService;