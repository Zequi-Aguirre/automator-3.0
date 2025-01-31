import { authProvider, AxiosProvider } from "../config/axiosProvider";
import { Lead } from "../types/leadTypes";

class LeadService {
    constructor(private readonly api: AxiosProvider) {}

    // Get all leads with oldDatabase support
    async getAll(oldDatabase: boolean = false): Promise<Lead[]> {
        const response = await this.api.getApi().get('/api/leads/admin/get-all', {
            params: { oldDatabase }
        });
        return response.data;
    }

    // Get many with filters, limit and page
    async getMany(filters: {
        page: number,
        limit: number,
        oldDatabase: boolean
    }): Promise<{ leads: Lead[], count: number }> {
        const response = await this.api.getApi().get(
            '/api/leads/admin/get-many',
            {
                params: filters
            }
        );
        return response.data;
    }

    // Get lead by id with oldDatabase support
    async getLeadById(leadId: string, oldDatabase: boolean): Promise<Lead> {
        const response = await this.api.getApi().get(
            `/api/leads/admin/get/${leadId}`,
            {
                params: { oldDatabase }
            }
        );
        return response.data;
    }

    // Update lead by id with oldDatabase support
    async updateLead(
        leadId: string,
        leadData: Partial<Lead>,
        oldDatabase: boolean = false
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(
            `/api/leads/admin/update/${leadId}`,
            leadData,
            {
                params: { oldDatabase }
            }
        );
        return response.data;
    }

    // Send lead by id with oldDatabase support
    async sendLead(
        leadId: string,
        oldDatabase: boolean = false
    ): Promise<{ success: boolean; message: string }> {
        const response = await this.api.getApi().patch(
            `/api/leads/admin/send/${leadId}`,
            {},  // empty body since we're sending params
            {
                params: { oldDatabase }
            }
        );
        return response.data;
    }

    // Trash lead by id with oldDatabase support
    async trashLead(
        leadId: string,
        oldDatabase: boolean
    ): Promise<Lead> {
        const response = await this.api.getApi().patch(
            `/api/leads/admin/trash/${leadId}`,
            {},  // empty body since we're sending params
            {
                params: { oldDatabase }
            }
        );
        return response.data;
    }

    async migrateLead(id: string): Promise<string> {
        const response = await this.api.getApi().post(`/api/leads/admin/migrate/${id}`);
        return response.data.newId; // Assuming the API returns the new ID
    }

    // Ping a lead with oldDatabase consideration
    async pingLead(leadData: {
        address: string;
        city: string;
        state: string;
        zipcode: string;
        oldDatabase: boolean;
    }): Promise<{ ping_id: string, company_name: string }> {
        const { oldDatabase, ...data } = leadData;
        const leadWithCampaignKey = {
            ...data,
            // TODO check if key or id
            campaign_key: import.meta.env.VITE_CAMPAIGN_KEY
        };

        const response = await this.api.getApi().post('/api/leads/ping', leadWithCampaignKey);
        return response.data;
    }

    // Post a lead with oldDatabase consideration
    async postLead(
        pingId: string,
        contactData: {
            first_name: string,
            last_name: string,
            phone: string,
            email: string
        },
        oldDatabase: boolean = false
    ): Promise<{ success: boolean }> {
        const response = await this.api.getApi().post(
            `/api/leads/post/${pingId}`,
            contactData,
            {
                params: { oldDatabase }
            }
        );
        return response.data;
    }
}

const leadsService = new LeadService(authProvider);

export default leadsService;