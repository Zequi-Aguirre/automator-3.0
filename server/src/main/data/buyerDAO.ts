import { injectable } from "tsyringe";
import { IDatabase } from 'pg-promise';
import { DBContainer } from "../config/DBContainer";
import { Buyer, BuyerCreateDTO, BuyerUpdateDTO, BuyerTimingUpdate, BuyerFilters, BuyerAuthConfig } from "../types/buyerTypes";
import { IClient } from "pg-promise/typescript/pg-subset";
import crypto from 'crypto';
import { EnvConfig } from "../config/envConfig";

@injectable()
export default class BuyerDAO {
    private readonly db: IDatabase<IClient>;
    private readonly encryptionKey: Buffer;
    private readonly algorithm = 'aes-256-cbc';

    constructor(db: DBContainer, envConfig: EnvConfig) {
        this.db = db.database();
        // Convert hex key to buffer for crypto operations
        this.encryptionKey = Buffer.from(envConfig.buyerAuthEncryptionKey, 'hex');
    }

    /**
     * Encrypt auth token using AES-256-CBC
     */
    private encryptToken(token: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
        let encrypted = cipher.update(token, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Return IV + encrypted data (IV needed for decryption)
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt auth token
     */
    private decryptToken(encryptedToken: string): string {
        const parts = encryptedToken.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
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
        const { page, limit, search, dispatch_mode } = filters;
        const offset = (page - 1) * limit;

        const whereClauses: string[] = ['deleted IS NULL'];

        if (search) {
            whereClauses.push(`name ILIKE '%' || $/search/ || '%'`);
        }

        if (dispatch_mode) {
            whereClauses.push(`dispatch_mode = $/dispatch_mode/`);
        }

        const whereSQL = whereClauses.join(' AND ');

        const itemsQuery = `
            SELECT *
            FROM buyers
            WHERE ${whereSQL}
            ORDER BY priority ASC
            LIMIT $/limit/
            OFFSET $/offset/;
        `;

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM buyers
            WHERE ${whereSQL};
        `;

        const items = await this.db.manyOrNone<Buyer>(itemsQuery, {
            limit,
            offset,
            search,
            dispatch_mode
        });

        const { total } = await this.db.one<{ total: number }>(countQuery, {
            search,
            dispatch_mode
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
     * Get worker buyers (dispatch_mode IN ('worker', 'both'))
     */
    async getWorkerBuyers(): Promise<Buyer[]> {
        const query = `
            SELECT *
            FROM buyers
            WHERE deleted IS NULL
            AND dispatch_mode IN ('worker', 'both')
            ORDER BY priority ASC;
        `;
        return await this.db.manyOrNone<Buyer>(query);
    }

    /**
     * Create new buyer
     */
    async create(dto: BuyerCreateDTO): Promise<Buyer> {
        // Encrypt auth token if provided
        const authTokenEncrypted = dto.auth_token
            ? this.encryptToken(dto.auth_token)
            : null;

        const query = `
            INSERT INTO buyers (
                name,
                webhook_url,
                dispatch_mode,
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
                enforce_state_cooldown
            )
            VALUES (
                $[name],
                $[webhook_url],
                $[dispatch_mode],
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
                $[enforce_state_cooldown]
            )
            RETURNING *;
        `;

        return await this.db.one<Buyer>(query, {
            name: dto.name,
            webhook_url: dto.webhook_url,
            dispatch_mode: dto.dispatch_mode || 'manual',
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
            enforce_state_cooldown: dto.enforce_state_cooldown ?? false
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

        // Encrypt auth token if provided
        const authTokenEncrypted = dto.auth_token !== undefined
            ? (dto.auth_token ? this.encryptToken(dto.auth_token) : null)
            : existing.auth_token_encrypted;

        const query = `
            UPDATE buyers
            SET
                name = $[name],
                webhook_url = $[webhook_url],
                dispatch_mode = $[dispatch_mode],
                priority = $[priority],
                auto_send = $[auto_send],
                allow_resell = $[allow_resell],
                requires_validation = $[requires_validation],
                min_minutes_between_sends = $[min_minutes_between_sends],
                max_minutes_between_sends = $[max_minutes_between_sends],
                auth_header_name = $[auth_header_name],
                auth_header_prefix = $[auth_header_prefix],
                auth_token_encrypted = $[auth_token_encrypted],
                blocked_affiliate_ids = $[blocked_affiliate_ids],
                states_on_hold = $[states_on_hold],
                delay_same_county = $[delay_same_county],
                delay_same_state = $[delay_same_state],
                enforce_county_cooldown = $[enforce_county_cooldown],
                enforce_state_cooldown = $[enforce_state_cooldown],
                modified = NOW()
            WHERE id = $[id]
            AND deleted IS NULL
            RETURNING *;
        `;

        const result = await this.db.oneOrNone<Buyer>(query, {
            id,
            name: dto.name ?? existing.name,
            webhook_url: dto.webhook_url ?? existing.webhook_url,
            dispatch_mode: dto.dispatch_mode ?? existing.dispatch_mode,
            priority: dto.priority ?? existing.priority,
            auto_send: dto.auto_send ?? existing.auto_send,
            allow_resell: dto.allow_resell ?? existing.allow_resell,
            requires_validation: dto.requires_validation ?? existing.requires_validation,
            min_minutes_between_sends: dto.min_minutes_between_sends ?? existing.min_minutes_between_sends,
            max_minutes_between_sends: dto.max_minutes_between_sends ?? existing.max_minutes_between_sends,
            auth_header_name: dto.auth_header_name ?? existing.auth_header_name,
            auth_header_prefix: dto.auth_header_prefix !== undefined ? dto.auth_header_prefix : existing.auth_header_prefix,
            auth_token_encrypted: authTokenEncrypted,
            blocked_affiliate_ids: dto.blocked_affiliate_ids ?? existing.blocked_affiliate_ids,
            states_on_hold: dto.states_on_hold ?? existing.states_on_hold,
            delay_same_county: dto.delay_same_county ?? existing.delay_same_county,
            delay_same_state: dto.delay_same_state ?? existing.delay_same_state,
            enforce_county_cooldown: dto.enforce_county_cooldown ?? existing.enforce_county_cooldown,
            enforce_state_cooldown: dto.enforce_state_cooldown ?? existing.enforce_state_cooldown
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
            auth_token_decrypted: buyer.auth_token_encrypted
                ? this.decryptToken(buyer.auth_token_encrypted)
                : null
        };
    }
}
