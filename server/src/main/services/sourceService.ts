import { injectable } from "tsyringe";
import crypto from 'crypto';
import SourceDAO from "../data/sourceDAO";
import { Source, SourceCreateDTO, SourceUpdateDTO, SourceFilters } from "../types/sourceTypes";

/**
 * SourceService - Business logic for lead sources with API authentication
 * TICKET-046: Handles token generation and source management
 *
 * Token Generation:
 * - 64-character hexadecimal string (32 random bytes = 256 bits entropy)
 * - Uses crypto.randomBytes() - cryptographically secure
 * - Collision detection with up to 5 retry attempts
 * - Stored in plaintext (high-entropy tokens don't require encryption)
 */
@injectable()
export default class SourceService {
    constructor(
        private readonly sourceDAO: SourceDAO
    ) {}

    /**
     * Generate a cryptographically secure 64-character hex token
     * Private method - only used internally
     */
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');  // 32 bytes = 64 hex chars
    }

    /**
     * Generate a unique token with collision detection
     * Retries up to 5 times if collision occurs (extremely unlikely)
     */
    private async generateUniqueToken(): Promise<string> {
        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const token = this.generateToken();
            const exists = await this.sourceDAO.tokenExists(token);

            if (!exists) {
                return token;
            }

            console.warn('Token collision detected, retrying', {
                attempt: attempt + 1,
                maxAttempts
            });
        }

        throw new Error('Failed to generate unique token after multiple attempts');
    }

    /**
     * Get source by ID
     */
    async getById(id: string): Promise<Source | null> {
        try {
            return await this.sourceDAO.getById(id);
        } catch (error) {
            console.error("Error fetching source by ID:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch source ${id}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get source by token (for authentication)
     */
    async getByToken(token: string): Promise<Source | null> {
        try {
            return await this.sourceDAO.getByToken(token);
        } catch (error) {
            console.error("Error fetching source by token:", {
                tokenPrefix: token.substring(0, 8) + '...',  // Log prefix only for security
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch source by token: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get all sources with pagination and filters
     */
    async getAll(filters: SourceFilters): Promise<{ items: Source[]; count: number }> {
        try {
            return await this.sourceDAO.getAll(filters);
        } catch (error) {
            console.error("Error fetching sources:", {
                filters,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch sources: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Create a new source with a unique token
     * Token is generated automatically and returned once
     */
    async create(data: SourceCreateDTO): Promise<Source> {
        try {
            // Validate input
            if (!data.name || data.name.trim().length === 0) {
                throw new Error('Source name is required');
            }

            if (!data.email || data.email.trim().length === 0) {
                throw new Error('Source email is required');
            }

            // Generate unique token
            const token = await this.generateUniqueToken();

            // Create source with token
            const source = await this.sourceDAO.create({
                ...data,
                token
            });

            console.info('Created new source', {
                id: source.id,
                name: source.name,
                email: source.email
            });

            return source;

        } catch (error) {
            console.error("Error creating source:", {
                data,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw error;  // Re-throw to preserve original error message
        }
    }

    /**
     * Update existing source (name, email only - not token)
     * Use refreshToken() to change token
     */
    async update(id: string, data: SourceUpdateDTO): Promise<Source> {
        try {
            const source = await this.sourceDAO.update(id, data);

            console.info('Updated source', {
                id: source.id,
                updatedFields: Object.keys(data)
            });

            return source;

        } catch (error) {
            console.error("Error updating source:", {
                id,
                data,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to update source ${id}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Refresh token for existing source
     * WARNING: Old token becomes invalid immediately
     * New token returned once - client must copy and store
     */
    async refreshToken(id: string): Promise<Source> {
        try {
            // Verify source exists
            const existing = await this.sourceDAO.getById(id);
            if (!existing) {
                throw new Error(`Source not found: ${id}`);
            }

            // Generate new unique token
            const token = await this.generateUniqueToken();

            // Update source with new token
            const source = await this.sourceDAO.update(id, { token });

            console.info('Refreshed token for source', {
                id: source.id,
                name: source.name
            });

            return source;

        } catch (error) {
            console.error("Error refreshing token:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw error;  // Re-throw to preserve original error message
        }
    }

    /**
     * Soft delete source
     * Token immediately becomes invalid (WHERE deleted IS NULL in auth)
     */
    async trash(id: string): Promise<Source> {
        try {
            const source = await this.sourceDAO.trash(id);

            console.info('Soft deleted source', {
                id: source.id,
                name: source.name
            });

            return source;

        } catch (error) {
            console.error("Error deleting source:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to delete source ${id}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Hard delete source (use with caution)
     * Should only be used for cleanup/testing
     */
    async delete(id: string): Promise<void> {
        try {
            await this.sourceDAO.delete(id);

            console.info('Hard deleted source', { id });

        } catch (error) {
            console.error("Error hard deleting source:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to hard delete source ${id}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }
}
