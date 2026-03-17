export type CallRequestReason = {
    id: string;
    label: string;
    active: boolean;
    comment_required: boolean;
    sort_order: number;
    created: string;
};

export type CallRequestReasonCreateDTO = {
    label: string;
    sort_order?: number;
};
