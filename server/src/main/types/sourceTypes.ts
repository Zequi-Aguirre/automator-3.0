/**
 * Source Types - API Authentication System
 * TICKET-046: Source-specific API key authentication for lead intake
 *
 * Sources represent external organizations sending leads via API.
 * Each source gets a unique 64-character token for Bearer authentication.
 */

/**
 * Source - Database entity
 * Represents an external lead source with API access
 */
export type Source = {
    id: string;
    token: string;  // 64-char hex token for Bearer auth
    name: string;
    created: string;  // ISO timestamp
    modified: string;  // ISO timestamp
    deleted: string | null;  // Soft delete timestamp
};

/**
 * SourceCreateDTO - Data for creating new source
 * Token will be generated automatically by service
 */
export type SourceCreateDTO = {
    name: string;
};

/**
 * SourceUpdateDTO - Data for updating existing source
 */
export type SourceUpdateDTO = {
    name?: string;
};

/**
 * SourceResponse - Standard API response (excludes token)
 * Used for GET requests - token never returned except on create/refresh
 */
export type SourceResponse = {
    id: string;
    name: string;
    created: string;
    modified: string;
    deleted: string | null;
};

/**
 * CreateSourceResponse - Response after creating source (includes token)
 * Token is shown only once - client must copy and store securely
 */
export type CreateSourceResponse = SourceResponse & {
    token: string;  // Only time token is returned
};

/**
 * RefreshTokenResponse - Response after refreshing token
 * Returns only ID and new token
 */
export type RefreshTokenResponse = {
    id: string;
    token: string;  // New token (old token immediately invalid)
};

/**
 * SourceFilters - Query filters for listing sources
 */
export type SourceFilters = {
    page: number;
    limit: number;
    search?: string;  // Search by name
    includeDeleted?: boolean;  // Include soft-deleted sources
};
