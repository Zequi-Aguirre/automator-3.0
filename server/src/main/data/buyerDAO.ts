import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { Buyer, BuyerCreateDTO, BuyerUpdateDTO, BuyerTimingUpdate, BuyerFilters, BuyerAuthConfig } from "../types/buyerTypes";
import { IClient } from "pg-promise/typescript/pg-subset";

@injectable()
export default class BuyerDAO {
    private readonly db: IDatabase<IClient>;

    constructor(db: DBContainer) {
        this.db = db.database();
    }

    /**
     * Get buyer by ID
     */
    async getById(id: string): Promise<Buyer | null> {
        const query = `
            SELECT *
            FROM buyers
            WHERE id = $[id]
            AND deleted IS NULL;
        `;
        return await this.db.oneOrNone<Buyer>(query, { id });
    }

    /**
     * Get all buyers with pagination and filters
     */
    async getAll(filters: BuyerFilters): Promise<{ items: Buyer[]; count: number }> {
        const { page, limit, search } = filters;
        const offset = (page - 1) * limit;

        const whereClauses: string[] = ['b.deleted IS NULL'];

        if (search) {
            whereClauses.push(`b.name ILIKE '%' || $/search/ || '%'`);
        }

        const whereSQL = whereClauses.join(' AND ');

        const itemsQuery = `
            SELECT b.*,
                   COUNT(sl.id)::int AS total_sends
            FROM buyers b
            LEFT JOIN send_log sl ON sl.buyer_id = b.id AND sl.deleted IS NULL
            WHERE ${whereSQL}
            GROUP BY b.id
            ORDER BY b.priority ASC
            LIMIT $/limit/
            OFFSET $/offset/;
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM buyers b
            WHERE ${whereSQL};
        `;

        const items = await this.db.manyOrNone<Buyer>(itemsQuery, {
            limit,
            offset,
            search
        });

        const { total } = await this.db.one<{ total: number }>(countQuery, {
            search
        });

        return { items, count: total };
    }

    /**
     * Get buyers sorted by priority
     */
    async getByPriority(): Promise<Buyer[]> {
        const query = `
            SELECT *
            FROM buyers
            WHERE deleted IS NULL
            ORDER BY priority ASC;
        `;
        return await this.db.manyOrNone<Buyer>(query);
    }

    /**
     * Get buyers with priority less than specified value
     */
    async getByPriorityLessThan(priority: number): Promise<Buyer[]> {
        const query = `
            SELECT *
            FROM buyers
            WHERE deleted IS NULL
            AND priority < $[priority]
            ORDER BY priority ASC;
        `;
        return await this.db.manyOrNone<Buyer>(query, { priority });
    }

    /**
     * Get auto-send buyers (auto_send = true)
     */
    async getAutoSendBuyers(): Promise<Buyer[]> {
        const query = `
            SELECT *
            FROM buyers
            WHERE deleted IS NULL
            AND auto_send = true
            ORDER BY priority ASC;
        `;
        return await this.db.manyOrNone<Buyer>(query);
    }

    /**
     * Get worker buyers (worker_send = true)
     */
    async getWorkerBuyers(): Promise<Buyer[]> {
        const query = `
            SELECT *
            FROM buyers
            WHERE deleted IS NULL
            AND worker_send = true
            ORDER BY priority ASC;
        `;
        return await this.db.manyOrNone<Buyer>(query);
    }

    /**
     * Create new buyer
     */
    async create(dto: BuyerCreateDTO): Promise<Buyer> {
        const authTokenEncrypted = dto.auth_token ?? null;

        const query = `
            INSERT INTO buyers (
                name,
                webhook_url,
                manual_send,
                worker_send,
                priority,
                auto_send,
                allow_resell,
                requires_validation,
                min_minutes_between_sends,
                max_minutes_between_sends,
                auth_header_name,
                auth_header_prefix,
                auth_token_encrypted,
                blocked_affiliate_ids,
                states_on_hold,
                delay_same_county,
                delay_same_state,
                enforce_county_cooldown,
                enforce_state_cooldown,
                payload_format
            )
            VALUES (
                $[name],
                $[webhook_url],
                $[manual_send],
                $[worker_send],
                $[priority],
                $[auto_send],
                $[allow_resell],
                $[requires_validation],
                $[min_minutes_between_sends],
                $[max_minutes_between_sends],
                $[auth_header_name],
                $[auth_header_prefix],
                $[auth_token_encrypted],
                $[blocked_affiliate_ids],
                $[states_on_hold],
                $[delay_same_county],
                $[delay_same_state],
                $[enforce_county_cooldown],
                $[enforce_state_cooldown],
                $[payload_format]
            )
            RETURNING *;
        `;

        return await this.db.one<Buyer>(query, {
            name: dto.name,
            webhook_url: dto.webhook_url,
            manual_send: dto.manual_send ?? true,
            worker_send: dto.worker_send ?? true,
            priority: dto.priority,
            auto_send: dto.auto_send || false,
            allow_resell: dto.allow_resell !== undefined ? dto.allow_resell : true,
            requires_validation: dto.requires_validation || false,
            min_minutes_between_sends: dto.min_minutes_between_sends || 4,
            max_minutes_between_sends: dto.max_minutes_between_sends || 11,
            auth_header_name: dto.auth_header_name || 'Authorization',
            auth_header_prefix: dto.auth_header_prefix || null,
            auth_token_encrypted: authTokenEncrypted,
            blocked_affiliate_ids: dto.blocked_affiliate_ids || [],
            states_on_hold: dto.states_on_hold || [],
            delay_same_county: dto.delay_same_county ?? 36,
            delay_same_state: dto.delay_same_state ?? 0,
            enforce_county_cooldown: dto.enforce_county_cooldown ?? true,
            enforce_state_cooldown: dto.enforce_state_cooldown ?? false,
            payload_format: dto.payload_format ?? 'default'
        });
    }

    /**
     * Update buyer
     */
    async update(id: string, dto: BuyerUpdateDTO): Promise<Buyer> {
        // Get existing buyer first
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error("Buyer not found");
        }

        const authTokenEncrypted = dto.auth_token !== undefined
            ? (dto.auth_token ?? null)
            : existing.auth_token_encrypted;

        const query = `
            UPDATE buyers
            SET
                name = $[name],
                webhook_url = $[webhook_url],
                manual_send = $[manual_send],
                worker_send = $[worker_send],
                priority = $[priority],
                auto_send = $[auto_send],
                allow_resell = $[allow_resell],
                requires_validation = $[requires_validation],
                min_minutes_between_sends = $[min_minutes_between_sends],
                max_minutes_between_sends = $[max_minutes_between_sends],
                next_send_at = $[next_send_at],
                auth_header_name = $[auth_header_name],
                auth_header_prefix = $[auth_header_prefix],
                auth_token_encrypted = $[auth_token_encrypted],
                blocked_affiliate_ids = $[blocked_affiliate_ids],
                states_on_hold = $[states_on_hold],
                delay_same_county = $[delay_same_county],
                delay_same_state = $[delay_same_state],
                enforce_county_cooldown = $[enforce_county_cooldown],
                enforce_state_cooldown = $[enforce_state_cooldown],
                payload_format = $[payload_format],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Buyer>(query, {
            id,
            name: dto.name ?? existing.name,
            webhook_url: dto.webhook_url ?? existing.webhook_url,
            manual_send: dto.manual_send ?? existing.manual_send,
            worker_send: dto.worker_send ?? existing.worker_send,
            priority: dto.priority ?? existing.priority,
            auto_send: dto.auto_send ?? existing.auto_send,
            allow_resell: dto.allow_resell ?? existing.allow_resell,
            requires_validation: dto.requires_validation ?? existing.requires_validation,
            min_minutes_between_sends: dto.min_minutes_between_sends ?? existing.min_minutes_between_sends,
            max_minutes_between_sends: dto.max_minutes_between_sends ?? existing.max_minutes_between_sends,
            next_send_at: dto.next_send_at !== undefined ? dto.next_send_at : existing.next_send_at,
            auth_header_name: dto.auth_header_name ?? existing.auth_header_name,
            auth_header_prefix: dto.auth_header_prefix !== undefined ? dto.auth_header_prefix : existing.auth_header_prefix,
            auth_token_encrypted: authTokenEncrypted,
            blocked_affiliate_ids: dto.blocked_affiliate_ids ?? existing.blocked_affiliate_ids,
            states_on_hold: dto.states_on_hold ?? existing.states_on_hold,
            delay_same_county: dto.delay_same_county ?? existing.delay_same_county,
            delay_same_state: dto.delay_same_state ?? existing.delay_same_state,
            enforce_county_cooldown: dto.enforce_county_cooldown ?? existing.enforce_county_cooldown,
            enforce_state_cooldown: dto.enforce_state_cooldown ?? existing.enforce_state_cooldown,
            payload_format: dto.payload_format ?? existing.payload_format
        });

        if (!result) {
            throw new Error("Buyer not found or update failed");
        }

        return result;
    }

    /**
     * Update buyer timing (next_send_at, last_send_at, total_sends)
     */
    async updateTiming(id: string, timing: BuyerTimingUpdate): Promise<Buyer> {
        const query = `
            UPDATE buyers
            SET
                next_send_at = $[next_send_at],
                last_send_at = $[last_send_at],
                total_sends = $[total_sends],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Buyer>(query, {
            id,
            next_send_at: timing.next_send_at,
            last_send_at: timing.last_send_at,
            total_sends: timing.total_sends
        });

        if (!result) {
            throw new Error("Buyer not found or timing update failed");
        }

        return result;
    }

    /**
     * Soft-delete buyer
     */
    async trash(id: string): Promise<Buyer> {
        const query = `
            UPDATE buyers
            SET deleted = NOW(),
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Buyer>(query, { id });
        if (!result) {
            throw new Error("Buyer not found or already deleted");
        }

        return result;
    }

    /**
     * Get decrypted auth config for buyer
     */
    async getAuthConfig(id: string): Promise<BuyerAuthConfig | null> {
        const buyer = await this.getById(id);
        if (!buyer) {
            return null;
        }

        return {
            auth_header_name: buyer.auth_header_name,
            auth_header_prefix: buyer.auth_header_prefix,
            auth_token_decrypted: buyer.auth_token_encrypted ?? null
        };
    }

    /**
     * Reorder buyer priority (drag-and-drop support)
     * TICKET-QA-012: Backend calculates which buyers need to shift
     *
     * Uses negative temporary values to avoid UNIQUE constraint violations
     * Two-pass approach:
     * 1. Set all affected priorities to negative temp values (multiply by -1000)
     * 2. Set all to their final positive values
     *
     * @param buyerId - ID of buyer being moved
     * @param oldPriority - Current priority of buyer
     * @param newPriority - Target priority for buyer
     */
    async reorderPriority(
        buyerId: string,
        oldPriority: number,
        newPriority: number
    ): Promise<void> {
        if (oldPriority === newPriority) {
            return; // No change needed
        }

        await this.db.tx(async t => {
            if (oldPriority > newPriority) {
                // Moving UP (e.g., 5 → 2)
                // Moved buyer: 5 → 2
                // Buyers at 2,3,4 → 3,4,5 (shift down)

                // Step 1: Set all affected buyers to negative temp values
                await t.none(`
                    UPDATE buyers
                    SET priority = priority * -1000, modified = NOW()
                    WHERE deleted IS NULL
                      AND (
                          id = $1
                          OR (priority >= $2 AND priority < $3)
                      )
                `, [buyerId, newPriority, oldPriority]);

                // Step 2: Set to final positive values
                await t.none(`
                    UPDATE buyers
                    SET
                        priority = CASE
                            WHEN id = $1 THEN $2
                            WHEN priority = $3 * -1000 THEN priority / -1000 + 1
                            ELSE priority / -1000 + 1
                        END,
                        modified = NOW()
                    WHERE deleted IS NULL
                      AND priority < 0
                `, [buyerId, newPriority, oldPriority]);
            } else {
                // Moving DOWN (e.g., 2 → 5)
                // Moved buyer: 2 → 5
                // Buyers at 3,4,5 → 2,3,4 (shift up)

                // Step 1: Set all affected buyers to negative temp values
                await t.none(`
                    UPDATE buyers
                    SET priority = priority * -1000, modified = NOW()
                    WHERE deleted IS NULL
                      AND (
                          id = $1
                          OR (priority > $3 AND priority <= $2)
                      )
                `, [buyerId, newPriority, oldPriority]);

                // Step 2: Set to final positive values
                await t.none(`
                    UPDATE buyers
                    SET
                        priority = CASE
                            WHEN id = $1 THEN $2
                            ELSE priority / -1000 - 1
                        END,
                        modified = NOW()
                    WHERE deleted IS NULL
                      AND priority < 0
                `, [buyerId, newPriority]);
            }
        });
    }
}
