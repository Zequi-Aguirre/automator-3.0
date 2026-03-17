import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { CallRequestReason, CallRequestReasonCreateDTO } from "../types/callRequestReasonTypes";

@injectable()
export default class CallRequestReasonDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<CallRequestReason[]> {
        return this.db.manyOrNone<CallRequestReason>(`
            SELECT * FROM call_request_reasons ORDER BY sort_order ASC, label ASC;
        `) || [];
    }

    async getActive(): Promise<CallRequestReason[]> {
        return this.db.manyOrNone<CallRequestReason>(`
            SELECT * FROM call_request_reasons
            WHERE active = true
            ORDER BY sort_order ASC, label ASC;
        `) || [];
    }

    async create(data: CallRequestReasonCreateDTO): Promise<CallRequestReason> {
        return this.db.one<CallRequestReason>(`
            INSERT INTO call_request_reasons (label, sort_order)
            VALUES ($[label], $[sort_order])
            RETURNING *;
        `, { label: data.label, sort_order: data.sort_order ?? 50 });
    }

    async setActive(id: string, active: boolean): Promise<CallRequestReason> {
        return this.db.one<CallRequestReason>(`
            UPDATE call_request_reasons
            SET active = $[active]
            WHERE id = $[id]
            RETURNING *;
        `, { id, active });
    }

    async setCommentRequired(id: string, commentRequired: boolean): Promise<CallRequestReason> {
        return this.db.one<CallRequestReason>(`
            UPDATE call_request_reasons
            SET comment_required = $[commentRequired]
            WHERE id = $[id]
            RETURNING *;
        `, { id, commentRequired });
    }

    async delete(id: string): Promise<CallRequestReason> {
        return this.db.one<CallRequestReason>(`
            DELETE FROM call_request_reasons
            WHERE id = $[id]
            RETURNING *;
        `, { id });
    }
}
