import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { Campaign } from "../types/campaignTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

@injectable()
export default class CampaignDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async createOne(campaign: Partial<Campaign>): Promise<Campaign> {
        const query = `
            INSERT INTO public."campaigns" (external_id, name, is_active)
            VALUES ($(external_id), $(name), $(is_active))
            RETURNING *;
        `;

        return await this.db.one<Campaign>(query, campaign);
    }

    // Get all campaigns with pagination
    async getAll(limit: number = 50, offset: number = 0): Promise<Campaign[]> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE deleted IS NULL
            ORDER BY created DESC
            LIMIT $(limit) OFFSET $(offset);
        `;

        return await this.db.manyOrNone<Campaign>(query, { limit, offset });
    }

    // Get only active campaigns with pagination
    async getActive(limit: number = 50, offset: number = 0): Promise<Campaign[]> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE deleted IS NULL
            AND is_active = true
            ORDER BY created DESC
            LIMIT $(limit) OFFSET $(offset);
        `;

        return await this.db.manyOrNone<Campaign>(query, { limit, offset });
    }

    async getById(campaignId: string): Promise<Campaign> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE id = $(campaignId)
            AND deleted IS NULL;
        `;

        return await this.db.one<Campaign>(query, { campaignId });
    }

    // get by external id
    async getByExternalId(externalId: string): Promise<Campaign> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE external_id = $(externalId)
            AND deleted IS NULL;
        `;

        return await this.db.one<Campaign>(query, { externalId });
    }

    async updateCampaign(
        id: string,
        updates: Partial<Omit<Campaign, 'id' | 'created' | 'modified' | 'deleted'>>
    ): Promise<Campaign> {
        if (!id) {
            throw new Error("Campaign ID is required");
        }

        // Fetch the complete updated fields dynamically
        const updatedFields = await this.getUpdatedCampaignFields(id, updates);

        // Dynamically construct the SET clause for the SQL query
        const setClause = Object.keys(updatedFields)
            .map((key) => `${key} = $[${key}]`)
            .join(", ");

        const query = `
        UPDATE public."campaigns"
        SET 
            ${setClause},
            modified = NOW()
        WHERE id = $[id]
        AND deleted IS NULL
        RETURNING *;
    `;

        // Include id in the query parameters
        const params = { ...updatedFields, id };

        // Execute the query
        const result = await this.db.oneOrNone<Campaign>(query, params);
        if (!result) {
            throw new Error("Campaign not found or update failed");
        }

        return result;
    }

    private async getUpdatedCampaignFields(
        id: string,
        updates: Partial<Omit<Campaign, 'id' | 'created' | 'modified' | 'deleted'>>
    ): Promise<Partial<Campaign>> {
        // Fetch the existing Campaign from the database
        const existingCampaign = await this.getById(id);
        if (!existingCampaign) {
            throw new Error("Campaign not found");
        }

        // Return only the updatable fields based on the Campaign type
        return {
            external_id: updates.external_id ?? existingCampaign.external_id,
            name: updates.name ?? existingCampaign.name,
            is_active: updates.is_active ?? existingCampaign.is_active
        };
    }

    // Update campaign status
    async updateCampaignStatus(campaignId: string, status: boolean): Promise<Campaign> {
        const query = `
            UPDATE public."campaigns"
            SET is_active = $(status)
            WHERE id = $(campaignId)
            RETURNING *;
        `;

        return await this.db.one<Campaign>(query, { campaignId, status });
    }

    // Delete campaign
    async deleteCampaign(campaignId: string): Promise<void> {
        const query = `
            UPDATE public."campaigns"
            SET deleted = now()
            WHERE id = $(campaignId);
        `;

        await this.db.none(query, { campaignId });
    }
}