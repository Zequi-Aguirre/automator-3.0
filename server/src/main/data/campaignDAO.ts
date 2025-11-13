import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
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
            VALUES ($[external_id], $[name], $[is_active])
            RETURNING *;
        `;
        return await this.db.one<Campaign>(query, campaign);
    }

    async getAll(limit: number = 50, offset: number = 0): Promise<Campaign[]> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE deleted IS NULL
            ORDER BY created DESC
            LIMIT $[limit] OFFSET $[offset];
        `;
        return await this.db.manyOrNone<Campaign>(query, { limit, offset });
    }

    async getActive(limit: number = 50, offset: number = 0): Promise<Campaign[]> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE deleted IS NULL
              AND is_active = true
            ORDER BY created DESC
            LIMIT $[limit] OFFSET $[offset];
        `;
        return await this.db.manyOrNone<Campaign>(query, { limit, offset });
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

    async getByExternalId(externalId: string): Promise<Campaign> {
        const query = `
            SELECT *
            FROM public."campaigns"
            WHERE external_id = $[externalId]
              AND deleted IS NULL;
        `;
        return await this.db.one<Campaign>(query, { externalId });
    }

    async updateCampaign(
        id: string,
        updates: Partial<Omit<Campaign, 'id' | 'created' | 'modified' | 'deleted'>>
    ): Promise<Campaign> {
        if (!id) throw new Error("Campaign ID is required");

        const updatedFields = await this.getUpdatedCampaignFields(id, updates);
        const setClause = Object.keys(updatedFields)
            .map((key) => `${key} = $[${key}]`)
            .join(", ");

        const query = `
            UPDATE public."campaigns"
            SET ${setClause},
                modified = NOW()
            WHERE id = $[id]
              AND deleted IS NULL
            RETURNING *;
        `;

        const params = { ...updatedFields, id };
        const result = await this.db.oneOrNone<Campaign>(query, params);
        if (!result) throw new Error("Campaign not found or update failed");

        return result;
    }

    private async getUpdatedCampaignFields(
        id: string,
        updates: Partial<Omit<Campaign, 'id' | 'created' | 'modified' | 'deleted'>>
    ): Promise<Partial<Campaign>> {
        const existing = await this.getById(id);
        if (!existing) throw new Error("Campaign not found");

        return {
            name: updates.name ?? existing.name,
        };
    }

    async updateCampaignStatus(campaignId: string, status: boolean): Promise<Campaign> {
        const query = `
            UPDATE public."campaigns"
            SET is_active = $[status]
            WHERE id = $[campaignId]
            RETURNING *;
        `;
        return await this.db.one<Campaign>(query, { campaignId, status });
    }

    async deleteCampaign(campaignId: string): Promise<void> {
        const query = `
            UPDATE public."campaigns"
            SET deleted = NOW()
            WHERE id = $[campaignId];
        `;
        await this.db.none(query, { campaignId });
    }

    async insertCampaign(data: { name: string; affiliate_id: string }): Promise<Campaign> {
        const query = `
        INSERT INTO campaigns (name, affiliate_id)
        VALUES ($[name], $[affiliate_id])
        RETURNING *;
    `;
        return await this.db.one<Campaign>(query, data);
    }

    async getAllCampaigns(): Promise<Campaign[]> {
        const query = `
            SELECT * 
            FROM campaigns 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<Campaign[]>(query);
    }

    async updateCampaignMetadata(
        id: string,
        updates: Partial<Pick<Campaign, 'rating' | 'blacklisted'>>
    ): Promise<Campaign> {
        const fields: string[] = [];
        if (updates.rating !== undefined) fields.push('rating = $[rating]');
        if (updates.blacklisted !== undefined) fields.push('blacklisted = $[blacklisted]');

        const setClause = fields.join(', ');
        const query = `
            UPDATE campaigns
            SET ${setClause},
                modified = NOW()
            WHERE id = $[id]
            RETURNING *;
        `;

        return await this.db.one<Campaign>(query, { ...updates, id });
    }
}