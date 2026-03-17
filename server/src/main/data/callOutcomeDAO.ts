import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { CallOutcome, CallOutcomeCreateDTO } from "../types/callOutcomeTypes";

@injectable()
export default class CallOutcomeDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<CallOutcome[]> {
        return this.db.manyOrNone<CallOutcome>(`
            SELECT * FROM call_outcomes ORDER BY sort_order ASC, label ASC;
        `) || [];
    }

    async getActive(): Promise<CallOutcome[]> {
        return this.db.manyOrNone<CallOutcome>(`
            SELECT * FROM call_outcomes
            WHERE active = true
            ORDER BY sort_order ASC, label ASC;
        `) || [];
    }

    async create(data: CallOutcomeCreateDTO): Promise<CallOutcome> {
        return this.db.one<CallOutcome>(`
            INSERT INTO call_outcomes (label, sort_order)
            VALUES ($[label], $[sort_order])
            RETURNING *;
        `, { label: data.label, sort_order: data.sort_order ?? 50 });
    }

    async setActive(id: string, active: boolean): Promise<CallOutcome> {
        return this.db.one<CallOutcome>(`
            UPDATE call_outcomes
            SET active = $[active]
            WHERE id = $[id]
            RETURNING *;
        `, { id, active });
    }

    async delete(id: string): Promise<CallOutcome> {
        return this.db.one<CallOutcome>(`
            DELETE FROM call_outcomes
            WHERE id = $[id]
            RETURNING *;
        `, { id });
    }
}
