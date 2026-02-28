import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import BuyerService from "../services/buyerService";
import { BuyerCreateDTO, BuyerUpdateDTO, Buyer } from "../types/buyerTypes";

@injectable()
export default class BuyerResource {
    private readonly router: Router;

    constructor(private readonly buyerService: BuyerService) {
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
                    search: req.query.search as string | undefined,
                    dispatch_mode: req.query.dispatch_mode as 'manual' | 'worker' | 'both' | undefined
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
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const dto: BuyerCreateDTO = req.body;

                // Validation
                if (!dto.name || !dto.webhook_url || dto.priority === undefined) {
                    return res.status(400).json({
                        error: 'Missing required fields: name, webhook_url, priority'
                    });
                }

                const buyer = await this.buyerService.create(dto);

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
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const dto: BuyerUpdateDTO = req.body;

                const buyer = await this.buyerService.update(id, dto);

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
        this.router.delete('/:id', async (req: Request, res: Response) => {
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
