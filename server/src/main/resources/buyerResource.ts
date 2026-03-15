import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import BuyerService from "../services/buyerService";
import ActivityService from "../services/activityService";
import { BuyerAction, EntityType } from "../types/activityTypes";
import { BuyerCreateDTO, BuyerUpdateDTO, Buyer } from "../types/buyerTypes";
import { requirePermission } from '../middleware/requirePermission';
import { BuyerPermission } from '../types/permissionTypes';

@injectable()
export default class BuyerResource {
    private readonly router: Router;

    constructor(
        private readonly buyerService: BuyerService,
        private readonly activityService: ActivityService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/buyers - Get all buyers with pagination
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 50,
                    search: req.query.search as string | undefined
                };

                const result = await this.buyerService.getAll(filters);

                // Mask auth_token_encrypted in responses
                const maskedItems = result.items.map(buyer => this.maskAuthToken(buyer));

                res.status(200).json({
                    items: maskedItems,
                    count: result.count
                });
            } catch (error) {
                console.error('Error fetching buyers:', error);
                res.status(500).json({
                    error: 'Failed to fetch buyers',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // PUT /api/buyers/reorder-priority - Reorder buyer priority (drag-and-drop)
        // TICKET-QA-012
        // IMPORTANT: This route must come BEFORE /:id routes to avoid matching "reorder-priority" as an ID
        this.router.put('/reorder-priority', requirePermission(BuyerPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { buyerId, oldPriority, newPriority } = req.body;

                if (!buyerId || oldPriority == null || newPriority == null) {
                    return res.status(400).json({
                        error: 'buyerId, oldPriority, and newPriority required'
                    });
                }

                await this.buyerService.reorderPriority(buyerId, oldPriority, newPriority);
                res.status(200).json({ success: true });
            } catch (error) {
                console.error('Error reordering priority:', error);
                res.status(500).json({
                    error: 'Failed to reorder priority',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // GET /api/buyers/:id - Get buyer by ID
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const buyer = await this.buyerService.getById(id);

                if (!buyer) {
                    return res.status(404).json({ error: 'Buyer not found' });
                }

                // Mask auth_token_encrypted in response
                res.status(200).json(this.maskAuthToken(buyer));
            } catch (error) {
                console.error('Error fetching buyer:', error);
                res.status(500).json({
                    error: 'Failed to fetch buyer',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // POST /api/buyers - Create new buyer
        this.router.post('/', requirePermission(BuyerPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const dto: BuyerCreateDTO = req.body;

                // Validation
                if (!dto.name || !dto.webhook_url || dto.priority === undefined) {
                    return res.status(400).json({
                        error: 'Missing required fields: name, webhook_url, priority'
                    });
                }

                const buyer = await this.buyerService.create(dto);

                await this.activityService.log({
                    user_id: req.user?.id,
                    entity_type: EntityType.BUYER,
                    entity_id: buyer.id,
                    action: BuyerAction.CREATED,
                    action_details: { name: buyer.name }
                });

                // Mask auth_token_encrypted in response
                res.status(201).json(this.maskAuthToken(buyer));
            } catch (error) {
                console.error('Error creating buyer:', error);
                res.status(400).json({
                    error: 'Failed to create buyer',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // PUT /api/buyers/:id - Update buyer
        this.router.put('/:id', requirePermission(BuyerPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const dto: BuyerUpdateDTO = req.body;

                const buyer = await this.buyerService.update(id, dto);

                await this.activityService.log({
                    user_id: req.user?.id,
                    entity_type: EntityType.BUYER,
                    entity_id: buyer.id,
                    action: BuyerAction.UPDATED,
                    action_details: { name: buyer.name }
                });

                // Mask auth_token_encrypted in response
                res.status(200).json(this.maskAuthToken(buyer));
            } catch (error) {
                console.error('Error updating buyer:', error);

                if (error instanceof Error && error.message.includes('not found')) {
                    return res.status(404).json({
                        error: 'Buyer not found',
                        message: error.message
                    });
                }

                res.status(400).json({
                    error: 'Failed to update buyer',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // DELETE /api/buyers/:id - Soft-delete buyer
        this.router.delete('/:id', requirePermission(BuyerPermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const buyer = await this.buyerService.trash(id);

                // Mask auth_token_encrypted in response
                res.status(200).json(this.maskAuthToken(buyer));
            } catch (error) {
                console.error('Error deleting buyer:', error);

                if (error instanceof Error && error.message.includes('not found')) {
                    return res.status(404).json({
                        error: 'Buyer not found',
                        message: error.message
                    });
                }

                res.status(500).json({
                    error: 'Failed to delete buyer',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    /**
     * Mask auth_token_encrypted in buyer response
     */
    private maskAuthToken(buyer: Buyer): Buyer {
        return {
            ...buyer,
            auth_token_encrypted: buyer.auth_token_encrypted ? '***MASKED***' : null
        };
    }

    public routes(): Router {
        return this.router;
    }
}
