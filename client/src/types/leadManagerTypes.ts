export type LeadManager = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    active: boolean;
    notes: string | null;
    created: string;
    modified: string;
    deleted: string | null;
};

export type LeadManagerCreateDTO = {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
};

export type LeadManagerUpdateDTO = {
    name?: string;
    email?: string;
    phone?: string;
    active?: boolean;
    notes?: string;
};
