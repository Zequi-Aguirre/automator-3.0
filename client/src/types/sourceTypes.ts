export type Source = {
    id: string;
    token?: string;  // Only present in CreateSourceResponse
    name: string;
    created: string;
    modified: string;
    deleted: string | null;
};

export type SourceCreateDTO = {
    name: string;
};

export type SourceUpdateDTO = {
    name?: string;
};

export type SourceResponse = {
    id: string;
    name: string;
    created: string;
    modified: string;
    deleted: string | null;
};

export type CreateSourceResponse = SourceResponse & {
    token: string;  // Only returned once on create
};

export type RefreshTokenResponse = {
    id: string;
    token: string;
};
