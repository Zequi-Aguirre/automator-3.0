import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { FlatLead, Lead, LeadDateField, LeadUpdateAllowedFieldsType } from "../types/leadTypes";
import { IClient } from "pg-promise/typescript/pg-subset";
import { County } from "../types/countyType.ts";

type CreateLeadDTO = Pick<Lead, 'address' | 'city' | 'state' | 'zipcode' | 'is_test' | 'county_id' >;

@injectable()
export default class LeadDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    // Create a new lead with basic information
    async createBasicLead(lead: CreateLeadDTO): Promise<Lead> {
        const query = `
            INSERT INTO leads (
                address,
                city,
                state,
                zipcode,
                county_id,
                is_test
            ) VALUES (
                $(address),
                $(city),
                $(state),
                $(zipcode),
                $(county_id),
                $(is_test)
            )
            RETURNING *;
        `;

        return await this.db.one<Lead>(query, lead);
    }

    // create full lead
    async createLead(lead: Lead): Promise<Lead> {
        const query = `
            INSERT INTO leads (
                address,
                city,
                state,
                zipcode,
                county_id,
                first_name,
                last_name,
                phone,
                email,
                is_test,
                vendor_lead_id
            ) VALUES (
                $(address),
                $(city),
                $(state),
                $(zipcode),
                $(county_id),
                $(first_name),
                $(last_name),
                $(phone),
                $(email),
                $(is_test),
                $(vendor_lead_id)
            )
            RETURNING *;
        `;

        return await this.db.one<Lead>(query, lead);
    }

    async updateLead(
        id: string,
        updates: Partial<LeadUpdateAllowedFieldsType>
    ): Promise<Lead> {
        if (!id) {
            throw new Error("Lead ID is required");
        }

        // Get the complete updated fields using the helper function
        const updatedFields = await this.getUpdatedLeadFields(id, updates);

        const query = `
            UPDATE leads
            SET 
                address = $[address],
                city = $[city],
                state = $[state],
                zipcode = $[zipcode],
                first_name = $[first_name],
                last_name = $[last_name],
                phone = $[phone],
                email = $[email],
                is_test = $[is_test],
                vendor_lead_id = $[vendor_lead_id],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        // Include all fields and id in the query parameters
        const params = { ...updatedFields, id };

        // Execute the query
        const result = await this.db.oneOrNone<Lead>(query, params);
        if (!result) {
            throw new Error("Lead not found or update failed");
        }

        return result;
    }

    private async getUpdatedLeadFields(
        id: string,
        updates: Partial<LeadUpdateAllowedFieldsType>
    ): Promise<LeadUpdateAllowedFieldsType> {
        // Fetch the existing Lead from the database
        const existingLead = await this.getById(id);
        if (!existingLead) {
            throw new Error("Lead not found");
        }

        // Combine the updates with the existing lead data
        return {
            address: updates.address ?? existingLead.address,
            city: updates.city ?? existingLead.city,
            state: updates.state ?? existingLead.state,
            zipcode: updates.zipcode ?? existingLead.zipcode,
            first_name: updates.first_name ?? existingLead.first_name,
            last_name: updates.last_name ?? existingLead.last_name,
            phone: updates.phone ?? existingLead.phone,
            email: updates.email ?? existingLead.email,
            is_test: updates.is_test ?? existingLead.is_test,
            vendor_lead_id: updates.vendor_lead_id ?? existingLead.vendor_lead_id,
        };
    }

    // Get lead by ID
    async getById(id: string): Promise<Lead | null> {
        const query = `
            SELECT *
            FROM leads
            WHERE id = $(id)
            AND deleted IS NULL;
        `;

        return await this.db.oneOrNone<Lead>(query, { id });
    }

    // Get all leads
    async getAll(limit: number = 50, offset: number = 0): Promise<Lead[]> {
        const query = `
            SELECT *
            FROM leads
            WHERE deleted IS NULL
            ORDER BY created DESC
            LIMIT $(limit) OFFSET $(offset);
        `;

        return await this.db.manyOrNone<Lead>(query, { limit, offset });
    }

    async getMany(filters: { page: number; limit: number }): Promise<{ leads: Lead[]; count: number }> {
        const query = `
            WITH filtered_leads AS (
                SELECT l.*
                FROM leads l
                LEFT JOIN buyer_lead bl ON l.id = bl.lead_id
                WHERE l.deleted IS NULL
                AND bl.id IS NULL
            ),
            paginated_leads AS (
                SELECT *
                FROM filtered_leads
                ORDER BY modified DESC
                LIMIT $1 OFFSET $2
            )
            SELECT 
                (SELECT COUNT(*) FROM filtered_leads) AS total_count,
                paginated_leads.*
            FROM paginated_leads;
        `;

            const result = await this.db.manyOrNone(query, [
                filters.limit,
                (filters.page - 1) * filters.limit
            ]);

            // Modified count query to match the same filter condition
            const countQuery = `
            SELECT COUNT(*) AS total_count
            FROM leads l
            LEFT JOIN buyer_lead bl ON l.id = bl.lead_id
            WHERE l.deleted IS NULL
            AND bl.id IS NULL;
        `;

        const countResult = await this.db.one(countQuery);

        return {
            leads: result || [],
            count: countResult.total_count || 0,
        };
    }

    async getNotSentLeads(limit: number = 1000): Promise<Lead[]> {
        const query = `
            SELECT l.*
            FROM leads l
            LEFT JOIN buyer_lead bl ON l.id = bl.lead_id
            WHERE l.deleted IS NULL
            AND bl.id IS NULL
            AND l.first_name IS NOT NULL
            AND l.last_name IS NOT NULL
            AND l.phone IS NOT NULL
            AND l.email IS NOT NULL
            ORDER BY l.modified DESC
            LIMIT $(limit);
        `;

        return await this.db.manyOrNone<Lead>(query, { limit });
    }

    async getNotBlacklistedLeads(
        blacklistedStates: string[],
        blacklistedCounties: string[],
        limit: number = 1000
    ): Promise<Lead[]> {
        console.log(blacklistedCounties);
        console.log(blacklistedStates);
        console.log('// TODO AU2-61 set black listed to empty array');
        blacklistedStates = [];
        blacklistedCounties = [];
        const query = `
            SELECT l.*, c.timezone
            FROM leads l
            LEFT JOIN buyer_lead bl ON l.id = bl.lead_id
            LEFT JOIN counties c ON l.county_id = c.id
            WHERE l.deleted IS NULL
            AND bl.id IS NULL
            AND l.first_name IS NOT NULL
            AND l.last_name IS NOT NULL
            AND l.phone IS NOT NULL
            AND l.email IS NOT NULL
            AND NOT (
                l.state = ANY($(blacklistedStates)::text[])
                OR (l.county_id = ANY($(blacklistedCounties)::uuid[]))
            )
            ORDER BY l.modified DESC
            LIMIT $(limit);
        `;

        return await this.db.manyOrNone<Lead>(query, {
            blacklistedStates,
            blacklistedCounties,
            limit
        });
    }

    async getLastLeadSentByState(state: string): Promise<{ sent_at: Date } | null> {
        // TODO AU2-61 ask Jason if the last sent is based on ping or post timestamp
        const query = `
            SELECT bl.post_date as sent_at
            FROM leads l
            JOIN buyer_lead bl ON l.id = bl.lead_id
            WHERE l.state = $(state)
            AND bl.post_date IS NOT NULL
            AND bl.post_result = 'success'
            ORDER BY bl.post_date DESC
            LIMIT 1;
        `;

        return await this.db.oneOrNone(query, { state });
    }

    async getLeadsWithBuyerDataByTimeWindow(
        hours: number,
        dateField: LeadDateField
    ): Promise<FlatLead[]> {
        if (hours <= 0) {
            throw new Error("Hours must be a positive number");
        }

        const selectedDateField = dateField === LeadDateField.PING_DATE ? 'bl.ping_date' : 'bl.post_date';

        const query = `
            SELECT 
                l.*,
                bl.id as "buyer_lead.id",
                bl.buyer_id as "buyer_lead.buyer_id",
                bl.campaign_id as "buyer_lead.campaign_id",
                bl.company_name as "buyer_lead.company_name",
                bl.error_message as "buyer_lead.error_message",
                bl.payout as "buyer_lead.payout",
                bl.ping_date as "buyer_lead.ping_date",
                bl.ping_id as "buyer_lead.ping_id",
                bl.ping_message as "buyer_lead.ping_message",
                bl.ping_result as "buyer_lead.ping_result",
                bl.post_date as "buyer_lead.post_date",
                bl.post_message as "buyer_lead.post_message",
                bl.post_result as "buyer_lead.post_result",
                bl.sent_by_user_id as "buyer_lead.sent_by_user_id",
                bl.status as "buyer_lead.status"
            FROM leads l
            JOIN buyer_lead bl ON l.id = bl.lead_id
            WHERE l.deleted IS NULL
            AND bl.deleted IS NULL
            AND ${selectedDateField}::timestamp >= NOW() - INTERVAL '${hours} hours'
            AND ${selectedDateField} IS NOT NULL
            ORDER BY ${selectedDateField} DESC;
        `;

        // Using proper parameterization
        return await this.db.manyOrNone(query, [hours]);
    }

    async getLastLeadSentByCounty(countyId: string): Promise<{ sent_at: Date } | null> {
        // TODO AU2-61 ask Jason if the last sent is based on ping or post timestamp
        const query = `
            SELECT bl.post_date as sent_at
            FROM leads l
            JOIN buyer_lead bl ON l.id = bl.lead_id
            WHERE l.county_id = $(countyId)
            AND bl.post_date IS NOT NULL
            AND bl.post_result = 'success'
            ORDER BY bl.post_date DESC
            LIMIT 1;
        `;

        return await this.db.oneOrNone(query, { countyId });
    }

    async trashLead(leadId: string): Promise<Lead> {
        const query = `
            UPDATE leads
            SET deleted = now()
            WHERE id = $(id)
            AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.one(query, { id: leadId });
    }

    async getAllCounties(): Promise<County[]> {
        const query = `
            SELECT * 
            FROM counties 
            WHERE deleted IS NULL;
        `;
        return await this.db.query<County[]>(query);
    }
}