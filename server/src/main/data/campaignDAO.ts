import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { DBContainer } from "../config/DBContainer";
import { Campaign, CampaignCreateDTO, CampaignUpdateDTO, CampaignFilters } from "../types/campaignTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

/**
 * CampaignDAO - Data Access Layer for campaigns table
 * TICKET-046: Updated to use source_id instead of affiliate_id
 *
 * Campaigns track marketing campaigns under a source.
 * Campaign names are intentionally not unique across sources.
 */
@injectable()
export default class CampaignDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getById(campaignId: string): Promise<Campaign> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE id = $[campaignId]
              AND deleted IS NULL;
        `;
        return await this.db.one<Campaign>(query, { campaignId });
    }

    /**
     * Get all campaigns with pagination and filters
     * TICKET-046: Supports source_id filtering and search
     */
    async getAll(filters: CampaignFilters): Promise<{ items: Campaign[]; count: number }> {
        const { page, limit, source_id, search, includeDeleted } = filters;
        const offset = (page - 1) * limit;

        // Build WHERE conditions
        const conditions: string[] = [];
        const params: any = { limit, offset };

        if (!includeDeleted) {
            conditions.push('deleted IS NULL');
        }

        if (source_id) {
            conditions.push('source_id = ${source_id}');
            params.source_id = source_id;
        }

        if (search) {
            conditions.push('name ILIKE ${search}');
            params.search = `%${search}%`;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Query campaigns with pagination
        const itemsQuery = `
            SELECT *
            FROM campaigns
            ${whereClause}
            ORDER BY modified DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const items = await this.db.manyOrNone<Campaign>(itemsQuery, params) || [];

        // Query total count
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM campaigns
            ${whereClause}
        `;
        const result = await this.db.one<{ total: number }>(countQuery, params);

        return {
            items,
            count: result.total
        };
    }

    async getManyByIds(ids: string[]): Promise<Campaign[]> {
        if (ids.length === 0) return [];
        const query = `
            SELECT *
            FROM campaigns
            WHERE id IN ($[ids:csv]) AND deleted IS NULL;
        `;
        return this.db.any<Campaign>(query, { ids });
    }

    /**
     * Get all campaigns for a specific source
     * Updated from getByAffiliateId to getBySourceId
     */
    async getBySourceId(sourceId: string): Promise<Campaign[]> {
        const query = `
            SELECT *
            FROM campaigns
            WHERE source_id = $[sourceId]
              AND deleted IS NULL
            ORDER BY created DESC;
        `;
        return await this.db.manyOrNone<Campaign>(query, { sourceId }) || [];
    }

    /**
     * Get campaign by name within a source
     * Campaigns are scoped to source - same name can exist across sources
     */
    async getByName(sourceId: string, name: string): Promise<Campaign | null> {
        const query = `
            SELECT *
            FROM campaigns
            WHERE source_id = $[sourceId]
                AND name = $[name]
                AND deleted IS NULL
            LIMIT 1;
        `;

        return await this.db.oneOrNone<Campaign>(query, { sourceId, name });
    }

    /**
     * Create new campaign
     * Updated from insertCampaign to use source_id
     */
    async create(data: CampaignCreateDTO): Promise<Campaign> {
        const query = `
            INSERT INTO campaigns (source_id, name, blacklisted, rating)
            VALUES ($[source_id], $[name], COALESCE($[blacklisted], false), COALESCE($[rating], 0))
            RETURNING *;
        `;

        return await this.db.one<Campaign>(query, data);
    }

    /**
     * Legacy method - kept for backward compatibility
     * Use create() for new code
     */
    async insertCampaign(data: { name: string; source_id: string }): Promise<Campaign> {
        return await this.create({
            source_id: data.source_id,
            name: data.name
        });
    }

    async getMany(filters: { page: number; limit: number }): Promise<{ campaigns: Campaign[]; count: number }> {
        const { page, limit } = filters;
        const offset = (page - 1) * limit;

        // Query #1: Get paginated campaigns
        const campaignsQuery = `
            SELECT *
            FROM campaigns
            WHERE deleted IS NULL
            ORDER BY modified DESC
            LIMIT $1 OFFSET $2
        `;
        const campaigns = await this.db.manyOrNone<Campaign>(campaignsQuery, [limit, offset]);

        // Query #2: Get total count (ignores pagination)
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM campaigns
            WHERE deleted IS NULL
        `;
        const { total } = await this.db.one<{ total: number }>(countQuery);

        return {
            campaigns,
            count: total
        };
    }

    async getAllCampaigns(): Promise<Campaign[]> {
        const query = `
            SELECT * 
            FROM campaigns 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<Campaign[]>(query);
    }

    /**
     * Update existing campaign
     * Uses COALESCE pattern - only updates provided fields
     */
    async update(id: string, data: CampaignUpdateDTO): Promise<Campaign> {
        const query = `
            UPDATE campaigns
            SET
                name = COALESCE($[name], name),
                blacklisted = COALESCE($[blacklisted], blacklisted),
                rating = COALESCE($[rating], rating)
            WHERE id = $[id]
                AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.one<Campaign>(query, { id, ...data });
    }

    /**
     * Legacy method - update campaign metadata
     * Kept for backward compatibility
     */
    async updateCampaignMetadata(
        id: string,
        updates: Partial<Pick<Campaign, 'rating' | 'blacklisted'>>
    ): Promise<Campaign> {
        return await this.update(id, updates);
    }

    /**
     * Soft delete campaign
     */
    async trash(id: string): Promise<Campaign> {
        const query = `
            UPDATE campaigns
            SET deleted = NOW()
            WHERE id = $[id]
                AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.one<Campaign>(query, { id });
    }

    /**
     * Get or create campaign by name within a source
     * Useful for API intake where campaign might not exist yet
     */
    async getOrCreate(sourceId: string, name: string): Promise<Campaign> {
        // Try to get existing campaign
        const existing = await this.getByName(sourceId, name);

        if (existing) {
            return existing;
        }

        // Create new campaign if doesn't exist
        return await this.create({
            source_id: sourceId,
            name,
            blacklisted: false,
            rating: 3  // Default rating (CHECK constraint requires 1-5)
        });
    }
}