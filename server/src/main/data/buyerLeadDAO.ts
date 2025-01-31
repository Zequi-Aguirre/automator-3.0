import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { DBContainer } from "../config/DBContainer";
import { BuyerLead, BuyerLeadCreateAllowedFieldsType, BuyerLeadUpdateAllowedFieldsType } from "../types/buyerLeadTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

@injectable()
export default class BuyerLeadDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    // Create a new buyer lead record
    async createBuyerLead(
        buyerLeadData: Partial<BuyerLeadCreateAllowedFieldsType>
    ): Promise<BuyerLead> {
        // Ensure only allowed fields are passed to the query
        const completeBuyerLeadData = this.getCompleteBuyerLeadData(buyerLeadData);

        const query = `
        INSERT INTO public."buyer_lead" (
            campaign_id,
            company_name,
            error_message,
            lead_id,
            payout,
            ping_date,
            ping_id,
            ping_message,
            ping_result,
            post_date,
            post_message,
            post_result,
            sent_by_user_id,
            status
        ) VALUES (
            $(campaign_id),
            $(company_name),
            $(error_message),
            $(lead_id),
            $(payout),
            $(ping_date),
            $(ping_id),
            $(ping_message),
            $(ping_result),
            $(post_date),
            $(post_message),
            $(post_result),
            $(sent_by_user_id),
            $(status)
        )
        RETURNING *;
    `;

        return await this.db.one<BuyerLead>(query, completeBuyerLeadData);
    }

    private getCompleteBuyerLeadData(
        buyerLeadData: Partial<BuyerLeadCreateAllowedFieldsType>
    ): BuyerLeadCreateAllowedFieldsType {
        // Return an object with default values for any missing required fields
        return {
            buyer_id: buyerLeadData.buyer_id || null,
            campaign_id: buyerLeadData.campaign_id!,
            company_name: buyerLeadData.company_name ?? null,
            error_message: buyerLeadData.error_message ?? null,
            lead_id: buyerLeadData.lead_id!,
            payout: buyerLeadData.payout ?? null,
            ping_date: buyerLeadData.ping_date ?? null,
            ping_id: buyerLeadData.ping_id || "", // Required field, ensure a default
            ping_message: buyerLeadData.ping_message ?? null,
            ping_result: buyerLeadData.ping_result ?? null,
            post_date: buyerLeadData.post_date ?? null,
            post_message: buyerLeadData.post_message ?? null,
            post_result: buyerLeadData.post_result ?? null,
            sent_by_user_id: buyerLeadData.sent_by_user_id!,
            status: buyerLeadData.status || "pending", // Default status, adjust as needed
        };
    }

    async updateBuyerLead(
        id: string,
        updates: Partial<Omit<BuyerLead, 'id' | 'created' | 'modified' | 'deleted'>>
    ): Promise<BuyerLead> {
        if (!id) {
            throw new Error("Buyer Lead ID is required");
        }

        // Fetch the complete updated fields dynamically
        const updatedFields = await this.getUpdatedBuyerLeadFields(id, updates);

        // Dynamically construct the SET clause for the SQL query
        const setClause = Object.keys(updatedFields)
            .map((key) => `${key} = $[${key}]`)
            .join(", ");

        const query = `
            UPDATE public."buyer_lead"
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
        const result = await this.db.oneOrNone<BuyerLead>(query, params);
        if (!result) {
            throw new Error("Buyer Lead not found or update failed");
        }

        return result;
    }

    private async getUpdatedBuyerLeadFields(
        id: string,
        updates: Partial<BuyerLeadUpdateAllowedFieldsType>
    ): Promise<BuyerLeadUpdateAllowedFieldsType> {
        // Fetch the existing Buyer Lead from the database
        const existingBuyerLead = await this.getBuyerLeadById(id);
        if (!existingBuyerLead) {
            throw new Error("Buyer Lead not found");
        }

        // Combine the updates with the existing buyer lead data
        return {
            ping_id: updates.ping_id ?? existingBuyerLead.ping_id,
            payout: updates.payout ?? existingBuyerLead.payout,
            status: updates.status ?? existingBuyerLead.status,
            ping_result: updates.ping_result ?? existingBuyerLead.ping_result,
            ping_message: updates.ping_message ?? existingBuyerLead.ping_message,
            ping_date: updates.ping_date ?? existingBuyerLead.ping_date,
            error_message: updates.error_message ?? existingBuyerLead.error_message,
            company_name: updates.company_name ?? existingBuyerLead.company_name,
            sent_by_user_id: updates.sent_by_user_id ?? existingBuyerLead.sent_by_user_id,
            post_result: updates.post_result ?? existingBuyerLead.post_result,
            post_message: updates.post_message ?? existingBuyerLead.post_message,
            post_date: updates.post_date ?? existingBuyerLead.post_date,
        };
    }

    // Get a buyer_lead by ping_id
    async getBuyerLeadByPingId(pingId: string): Promise<BuyerLead | null> {
        const query = `
            SELECT *
            FROM public."buyer_lead"
            WHERE ping_id = $(pingId)
            AND deleted IS NULL;
        `;

        return await this.db.oneOrNone<BuyerLead>(query, { pingId });
    }

    // Get a buyer lead by ID
    async getBuyerLeadById(id: string): Promise<BuyerLead | null> {
        const query = `
            SELECT *
            FROM public."buyer_lead"
            WHERE id = $(id)
            AND deleted IS NULL;
        `;

        return await this.db.oneOrNone<BuyerLead>(query, { id });
    }

    // Get buyer leads by buyer ID
    async getBuyerLeadsByBuyerId(buyerId: string, limit: number = 50, offset: number = 0): Promise<BuyerLead[]> {
        const query = `
            SELECT *
            FROM public."buyer_lead"
            WHERE buyer_id = $(buyerId)
            AND deleted IS NULL
            ORDER BY created DESC
            LIMIT $(limit) OFFSET $(offset);
        `;

        return await this.db.manyOrNone<BuyerLead>(query, { buyerId, limit, offset });
    }

    // Soft delete a buyer lead
    async deleteBuyerLead(id: string): Promise<void> {
        const query = `
            UPDATE public."buyer_lead"
            SET 
                deleted = NOW()
            WHERE id = $(id);
        `;

        await this.db.none(query, { id });
    }

    // Get buyer leads by status
    async getBuyerLeadsByStatus(status: string, limit: number = 50, offset: number = 0): Promise<BuyerLead[]> {
        const query = `
            SELECT *
            FROM public."buyer_lead"
            WHERE status = $(status)
            AND deleted IS NULL
            ORDER BY created DESC
            LIMIT $(limit) OFFSET $(offset);
        `;

        return await this.db.manyOrNone<BuyerLead>(query, { status, limit, offset });
    }

    // get last buyer lead for many campaign ids
    async getLastBuyerLeadForCampaignIds(campaignIds: string[]): Promise<BuyerLead[]> {
        const query = `
        SELECT *
        FROM public."buyer_lead"
        WHERE campaign_id = ANY($(campaignIds)::uuid[])
        AND deleted IS NULL
        ORDER BY created DESC
        LIMIT 1;
    `;

        return await this.db.manyOrNone<BuyerLead>(query, { campaignIds });
    }
}