// TICKET-152: Lead Custom Fields
// Admin-managed schema definitions for dynamic lead data.

export type LeadCustomFieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'boolean';

export type LeadCustomField = {
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
};

export type LeadCustomFieldCreateDTO = {
    key: string;
    label: string;
    description?: string | null;
    field_type?: LeadCustomFieldType;
    options?: string[] | null;
    required?: boolean;
    sort_order?: number;
};

export type LeadCustomFieldUpdateDTO = {
    label?: string;
    description?: string | null;
    field_type?: LeadCustomFieldType;
    options?: string[] | null;
    required?: boolean;
    active?: boolean;
    sort_order?: number;
};
