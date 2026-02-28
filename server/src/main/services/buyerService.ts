import { injectable } from "tsyringe";
import BuyerDAO from "../data/buyerDAO";
import { Buyer, BuyerCreateDTO, BuyerUpdateDTO, BuyerTimingUpdate, BuyerFilters, BuyerAuthConfig } from "../types/buyerTypes";

@injectable()
export default class BuyerService {
    constructor(
        private readonly buyerDAO: BuyerDAO
    ) {}

    /**
     * Get buyer by ID
     */
    async getById(id: string): Promise<Buyer | null> {
        try {
            return await this.buyerDAO.getById(id);
        } catch (error) {
            console.error("Error fetching buyer by ID:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch buyer ${id}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get all buyers with pagination and filters
     */
    async getAll(filters: BuyerFilters): Promise<{ items: Buyer[]; count: number }> {
        try {
            return await this.buyerDAO.getAll(filters);
        } catch (error) {
            console.error("Error fetching buyers:", {
                filters,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch buyers: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get buyers sorted by priority
     */
    async getByPriority(): Promise<Buyer[]> {
        try {
            return await this.buyerDAO.getByPriority();
        } catch (error) {
            console.error("Error fetching buyers by priority:", {
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch buyers by priority: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get auto-send buyers
     */
    async getAutoSendBuyers(): Promise<Buyer[]> {
        try {
            return await this.buyerDAO.getAutoSendBuyers();
        } catch (error) {
            console.error("Error fetching auto-send buyers:", {
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch auto-send buyers: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get worker buyers (dispatch_mode IN ('worker', 'both'))
     */
    async getWorkerBuyers(): Promise<Buyer[]> {
        try {
            return await this.buyerDAO.getWorkerBuyers();
        } catch (error) {
            console.error("Error fetching worker buyers:", {
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch worker buyers: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Create new buyer with validation
     */
    async create(dto: BuyerCreateDTO): Promise<Buyer> {
        // Validation: min < max minutes
        const minMinutes = dto.min_minutes_between_sends ?? 4;
        const maxMinutes = dto.max_minutes_between_sends ?? 11;
        if (minMinutes >= maxMinutes) {
            throw new Error("min_minutes_between_sends must be less than max_minutes_between_sends");
        }

        // Validation: valid URL
        try {
            new URL(dto.webhook_url);
        } catch {
            throw new Error("webhook_url must be a valid URL");
        }

        // Auto-assign next available priority if there's a conflict
        const existingBuyers = await this.buyerDAO.getByPriority();
        if (existingBuyers.some(b => b.priority === dto.priority)) {
            // Find first gap in priority sequence, or max + 1 if no gaps
            const priorities = existingBuyers.map(b => b.priority).sort((a, b) => a - b);
            let nextAvailable = 1;
            for (const priority of priorities) {
                if (priority === nextAvailable) {
                    nextAvailable++;
                } else if (priority > nextAvailable) {
                    break; // Found a gap
                }
            }
            throw new Error(
                `Priority ${dto.priority} is already in use. Next available priority: ${nextAvailable}`
            );
        }

        try {
            return await this.buyerDAO.create(dto);
        } catch (error) {
            console.error("Error creating buyer:", {
                dto,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to create buyer: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Update buyer with validation
     */
    async update(id: string, dto: BuyerUpdateDTO): Promise<Buyer> {
        // Get existing buyer
        const existing = await this.getById(id);
        if (!existing) {
            throw new Error("Buyer not found");
        }

        // Validation: min < max minutes
        const minMinutes = dto.min_minutes_between_sends ?? existing.min_minutes_between_sends;
        const maxMinutes = dto.max_minutes_between_sends ?? existing.max_minutes_between_sends;
        if (minMinutes >= maxMinutes) {
            throw new Error("min_minutes_between_sends must be less than max_minutes_between_sends");
        }

        // Validation: valid URL if provided
        if (dto.webhook_url) {
            try {
                new URL(dto.webhook_url);
            } catch {
                throw new Error("webhook_url must be a valid URL");
            }
        }

        // Validation: priority unique if changed
        if (dto.priority !== undefined && dto.priority !== existing.priority) {
            const existingBuyers = await this.buyerDAO.getByPriority();
            if (existingBuyers.some(b => b.priority === dto.priority)) {
                // Find first gap in priority sequence, or max + 1 if no gaps
                const priorities = existingBuyers.map(b => b.priority).sort((a, b) => a - b);
                let nextAvailable = 1;
                for (const priority of priorities) {
                    if (priority === nextAvailable) {
                        nextAvailable++;
                    } else if (priority > nextAvailable) {
                        break; // Found a gap
                    }
                }
                throw new Error(
                    `Priority ${dto.priority} is already in use. Next available priority: ${nextAvailable}`
                );
            }
        }

        try {
            return await this.buyerDAO.update(id, dto);
        } catch (error) {
            console.error("Error updating buyer:", {
                id,
                dto,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to update buyer: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Update buyer timing
     */
    async updateTiming(id: string, timing: BuyerTimingUpdate): Promise<Buyer> {
        try {
            return await this.buyerDAO.updateTiming(id, timing);
        } catch (error) {
            console.error("Error updating buyer timing:", {
                id,
                timing,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to update buyer timing: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Soft-delete buyer
     */
    async trash(id: string): Promise<Buyer> {
        try {
            return await this.buyerDAO.trash(id);
        } catch (error) {
            console.error("Error trashing buyer:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to trash buyer: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Get decrypted auth config for buyer
     */
    async getAuthConfig(id: string): Promise<BuyerAuthConfig | null> {
        try {
            return await this.buyerDAO.getAuthConfig(id);
        } catch (error) {
            console.error("Error fetching buyer auth config:", {
                id,
                error: error instanceof Error ? error.message : "Unknown error"
            });
            throw new Error(
                `Failed to fetch buyer auth config: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }
}
