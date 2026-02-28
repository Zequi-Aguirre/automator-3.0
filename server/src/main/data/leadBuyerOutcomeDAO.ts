import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { LeadBuyerOutcome, OutcomeCreateDTO, OutcomeUpdateDTO } from "../types/leadBuyerOutcomeTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

@injectable()
export default class LeadBuyerOutcomeDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    /**
     * Create new lead-buyer outcome
     */
    async create(dto: OutcomeCreateDTO): Promise<LeadBuyerOutcome> {
        const query = `
            INSERT INTO lead_buyer_outcomes (
                lead_id,
                buyer_id,
                status,
                sold_at,
                sold_price,
                notes
            )
            VALUES (
                $[lead_id],
                $[buyer_id],
                $[status],
                $[sold_at],
                $[sold_price],
                $[notes]
            )
            RETURNING *;
        `;

        return await this.db.one<LeadBuyerOutcome>(query, {
            lead_id: dto.lead_id,
            buyer_id: dto.buyer_id,
            status: dto.status || 'sold',
            sold_at: dto.sold_at || null,
            sold_price: dto.sold_price || null,
            notes: dto.notes || null
        });
    }

    /**
     * Get all outcomes for a lead
     */
    async getByLeadId(leadId: string): Promise<LeadBuyerOutcome[]> {
        const query = `
            SELECT *
            FROM lead_buyer_outcomes
            WHERE lead_id = $[leadId]
            AND deleted IS NULL
            ORDER BY created DESC;
        `;
        return await this.db.manyOrNone<LeadBuyerOutcome>(query, { leadId });
    }

    /**
     * Get outcome by lead and buyer
     */
    async getByLeadAndBuyer(leadId: string, buyerId: string): Promise<LeadBuyerOutcome | null> {
        const query = `
            SELECT *
            FROM lead_buyer_outcomes
            WHERE lead_id = $[leadId]
            AND buyer_id = $[buyerId]
            AND deleted IS NULL;
        `;
        return await this.db.oneOrNone<LeadBuyerOutcome>(query, { leadId, buyerId });
    }

    /**
     * Check if lead was sold to buyer
     */
    async wasSoldToBuyer(leadId: string, buyerId: string): Promise<boolean> {
        const outcome = await this.getByLeadAndBuyer(leadId, buyerId);
        return outcome !== null;
    }

    /**
     * Update outcome
     */
    async update(id: string, dto: OutcomeUpdateDTO): Promise<LeadBuyerOutcome> {
        // Get existing outcome first
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error("Lead-buyer outcome not found");
        }

        const query = `
            UPDATE lead_buyer_outcomes
            SET
                status = $[status],
                sold_at = $[sold_at],
                sold_price = $[sold_price],
                notes = $[notes],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<LeadBuyerOutcome>(query, {
            id,
            status: dto.status ?? existing.status,
            sold_at: dto.sold_at !== undefined ? dto.sold_at : existing.sold_at,
            sold_price: dto.sold_price !== undefined ? dto.sold_price : existing.sold_price,
            notes: dto.notes !== undefined ? dto.notes : existing.notes
        });

        if (!result) {
            throw new Error("Lead-buyer outcome not found or update failed");
        }

        return result;
    }

    /**
     * Get outcome by ID
     */
    async getById(id: string): Promise<LeadBuyerOutcome | null> {
        const query = `
            SELECT *
            FROM lead_buyer_outcomes
            WHERE id = $[id]
            AND deleted IS NULL;
        `;
        return await this.db.oneOrNone<LeadBuyerOutcome>(query, { id });
    }

    /**
     * Soft-delete outcome
     */
    async trash(id: string): Promise<LeadBuyerOutcome> {
        const query = `
            UPDATE lead_buyer_outcomes
            SET deleted = NOW(),
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<LeadBuyerOutcome>(query, { id });
        if (!result) {
            throw new Error("Lead-buyer outcome not found or already deleted");
        }

        return result;
    }
}
