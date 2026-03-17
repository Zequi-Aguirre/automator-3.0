export type CallOutcome = {
    id: string;
    label: string;
    active: boolean;
    sort_order: number;
    created: string;
};

export type CallOutcomeCreateDTO = {
    label: string;
    sort_order?: number;
};
