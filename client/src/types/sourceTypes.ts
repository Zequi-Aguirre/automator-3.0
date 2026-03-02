/**
 * Source Types - Frontend type definitions
 * TICKET-046: Lead source API authentication
 */

export type Source = {
    id: string;
    token: string;  // Only present in CreateSourceResponse
    name: string;
    email: string;
    created: string;
    modified: string;
    deleted: string | null;
};

export type SourceCreateDTO = {
    name: string;
    email: string;
};

export type SourceUpdateDTO = {
    name?: string;
    email?: string;
};

export type SourceResponse = {
    id: string;
    name: string;
    email: string;
    created: string;
    modified: string;
    deleted: string | null;
    // token intentionally excluded (masked)
};

export type CreateSourceResponse = SourceResponse & {
    token: string;  // Only returned once on create
};

export type RefreshTokenResponse = {
    id: string;
    token: string;  // New token (old token invalid)
};
