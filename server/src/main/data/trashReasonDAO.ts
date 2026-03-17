import { injectable } from "tsyringe";
import { IDatabase } from "pg-promise";
import { IClient } from "pg-promise/typescript/pg-subset";
import { DBContainer } from "../config/DBContainer";
import { TrashReason, TrashReasonCreateDTO } from "../types/trashReasonTypes";

@injectable()
export default class TrashReasonDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    async getAll(): Promise<TrashReason[]> {
        return this.db.manyOrNone<TrashReason>(`
            SELECT * FROM trash_reasons ORDER BY sort_order ASC, label ASC;
        `) || [];
    }

    async getActive(): Promise<TrashReason[]> {
        return this.db.manyOrNone<TrashReason>(`
            SELECT * FROM trash_reasons
            WHERE active = true
            ORDER BY sort_order ASC, label ASC;
        `) || [];
    }

    async create(data: TrashReasonCreateDTO): Promise<TrashReason> {
        return this.db.one<TrashReason>(`
            INSERT INTO trash_reasons (label, sort_order)
            VALUES ($[label], $[sort_order])
            RETURNING *;
        `, { label: data.label, sort_order: data.sort_order ?? 50 });
    }

    async setActive(id: string, active: boolean): Promise<TrashReason> {
        return this.db.one<TrashReason>(`
            UPDATE trash_reasons
            SET active = $[active]
            WHERE id = $[id]
            RETURNING *;
        `, { id, active });
    }

    async setCommentRequired(id: string, commentRequired: boolean): Promise<TrashReason> {
        return this.db.one<TrashReason>(`
            UPDATE trash_reasons
            SET comment_required = $[commentRequired]
            WHERE id = $[id]
            RETURNING *;
        `, { id, commentRequired });
    }
}
