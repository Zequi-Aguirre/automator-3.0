import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import {
    LeadFormInput,
    LeadFormInputCreate,
    LeadFormInputUpdate,
} from "../types/leadFormInputTypes";

@injectable()
export default class LeadFormInputDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getByLeadId(leadId: string): Promise<LeadFormInput | null> {
        const query = `
      SELECT *
      FROM lead_form_inputs
      WHERE lead_id = [leadId]
      AND deleted IS NULL;
    `;
        return await this.db.oneOrNone(query, { leadId });
    }

    async create(input: LeadFormInputCreate): Promise<LeadFormInput> {
        const query = `
      INSERT INTO lead_form_inputs (
        id,
        lead_id,
        form_unit,
        form_multifamily,
        form_square,
        form_year,
        form_garage,
        form_bedrooms,
        form_bathrooms,
        form_repairs,
        form_occupied,
        form_sell_fast,
        form_goal,
        form_goal2,
        form_call_time,
        form_owner,
        form_owned_years,
        form_listed,
        form_scenario,
        form_source,
        activeprospect_certificate_url,
        record_link,
        last_post_status,
        last_post_payload,
        last_post_at
      )
      VALUES (
        gen_random_uuid(),
        [lead_id],
        [form_unit],
        [form_multifamily],
        [form_square],
        [form_year],
        [form_garage],
        [form_bedrooms],
        [form_bathrooms],
        [form_repairs],
        [form_occupied],
        [form_sell_fast],
        [form_goal],
        [form_goal2],
        [form_call_time],
        [form_owner],
        [form_owned_years],
        [form_listed],
        [form_scenario],
        [form_source],
        [activeprospect_certificate_url],
        [record_link],
        [last_post_status],
        [last_post_payload],
        [last_post_at]
      )
      RETURNING *;
    `;
        return await this.db.one<LeadFormInput>(query, input);
    }

    async update(
        leadId: string,
        updates: LeadFormInputUpdate
    ): Promise<LeadFormInput> {
        const existing = await this.getByLeadId(leadId);
        if (!existing) {
            throw new Error("LeadFormInput not found");
        }

        const updated: LeadFormInputUpdate = {
            form_unit: updates.form_unit ?? existing.form_unit,
            form_multifamily: updates.form_multifamily ?? existing.form_multifamily,
            form_square: updates.form_square ?? existing.form_square,
            form_year: updates.form_year ?? existing.form_year,
            form_garage: updates.form_garage ?? existing.form_garage,
            form_bedrooms: updates.form_bedrooms ?? existing.form_bedrooms,
            form_bathrooms: updates.form_bathrooms ?? existing.form_bathrooms,
            form_repairs: updates.form_repairs ?? existing.form_repairs,
            form_occupied: updates.form_occupied ?? existing.form_occupied,
            form_sell_fast: updates.form_sell_fast ?? existing.form_sell_fast,
            form_goal: updates.form_goal ?? existing.form_goal,
            form_goal2: updates.form_goal2 ?? existing.form_goal2,
            form_call_time: updates.form_call_time ?? existing.form_call_time,
            form_owner: updates.form_owner ?? existing.form_owner,
            form_owned_years: updates.form_owned_years ?? existing.form_owned_years,
            form_listed: updates.form_listed ?? existing.form_listed,
            form_scenario: updates.form_scenario ?? existing.form_scenario,
            form_source: updates.form_source ?? existing.form_source,
            activeprospect_certificate_url:
                updates.activeprospect_certificate_url ??
                existing.activeprospect_certificate_url,
            record_link: updates.record_link ?? existing.record_link,
        };

        const query = `
      UPDATE lead_form_inputs
      SET
        form_unit = [form_unit],
        form_multifamily = [form_multifamily],
        form_square = [form_square],
        form_year = [form_year],
        form_garage = [form_garage],
        form_bedrooms = [form_bedrooms],
        form_bathrooms = [form_bathrooms],
        form_repairs = [form_repairs],
        form_occupied = [form_occupied],
        form_sell_fast = [form_sell_fast],
        form_goal = [form_goal],
        form_goal2 = [form_goal2],
        form_call_time = [form_call_time],
        form_owner = [form_owner],
        form_owned_years = [form_owned_years],
        form_listed = [form_listed],
        form_scenario = [form_scenario],
        form_source = [form_source],
        activeprospect_certificate_url = [activeprospect_certificate_url],
        record_link = [record_link],
        modified = NOW()
      WHERE lead_id = [leadId]
      AND deleted IS NULL
      RETURNING *;
    `;

        return await this.db.one<LeadFormInput>(query, { ...updated, leadId });
    }

    async delete(leadId: string): Promise<void> {
        const query = `
      UPDATE lead_form_inputs
      SET deleted = NOW()
      WHERE lead_id = [leadId]
      AND deleted IS NULL;
    `;
        await this.db.none(query, { leadId });
    }
}