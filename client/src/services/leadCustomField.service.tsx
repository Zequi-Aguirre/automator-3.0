// TICKET-152: Lead Custom Fields service
import { authProvider, AxiosProvider } from '../config/axiosProvider';

export type LeadCustomFieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean';

export interface LeadCustomField {
    id: string;
    key: string;
    label: string;
    description: string | null;
    field_type: LeadCustomFieldType;
    options: string[] | null;
    required: boolean;
    active: boolean;
    auto_discovered: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface LeadCustomFieldCreateDTO {
    key: string;
    label: string;
    description?: string | null;
    field_type?: LeadCustomFieldType;
    options?: string[] | null;
    required?: boolean;
    sort_order?: number;
}

export interface LeadCustomFieldUpdateDTO {
    label?: string;
    description?: string | null;
    field_type?: LeadCustomFieldType;
    options?: string[] | null;
    required?: boolean;
    sort_order?: number;
}

class LeadCustomFieldService {
    constructor(private readonly api: AxiosProvider) {}

    async getAll(): Promise<LeadCustomField[]> {
        const res = await this.api.getApi().get('/api/lead-custom-fields');
        return res.data;
    }

    async getActive(): Promise<LeadCustomField[]> {
        const res = await this.api.getApi().get('/api/lead-custom-fields/active');
        return res.data;
    }

    async getAutoDiscoveredCount(): Promise<number> {
        const res = await this.api.getApi().get('/api/lead-custom-fields/auto-discovered-count');
        return (res.data as { count: number }).count;
    }

    async create(data: LeadCustomFieldCreateDTO): Promise<LeadCustomField> {
        const res = await this.api.getApi().post('/api/lead-custom-fields', data);
        return res.data;
    }

    async update(id: string, data: LeadCustomFieldUpdateDTO): Promise<LeadCustomField> {
        const res = await this.api.getApi().patch(`/api/lead-custom-fields/${id}`, data);
        return res.data;
    }

    async setActive(id: string, active: boolean): Promise<LeadCustomField> {
        const res = await this.api.getApi().patch(`/api/lead-custom-fields/${id}/active`, { active });
        return res.data;
    }

    async updateLeadCustomFields(leadId: string, customFields: Record<string, unknown>): Promise<unknown> {
        const res = await this.api.getApi().patch(`/api/leads/custom-fields/${leadId}`, { custom_fields: customFields });
        return res.data;
    }
}

const leadCustomFieldService = new LeadCustomFieldService(authProvider);
export default leadCustomFieldService;
