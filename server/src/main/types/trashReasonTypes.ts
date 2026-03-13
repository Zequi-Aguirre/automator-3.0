export type TrashReason = {
    id: string;
    label: string;
    active: boolean;
    sort_order: number;
    created: string;
};

export type TrashReasonCreateDTO = {
    label: string;
    sort_order?: number;
};
