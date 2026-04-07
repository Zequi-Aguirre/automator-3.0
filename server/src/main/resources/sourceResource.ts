import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import SourceService from "../services/sourceService";
import ActivityService from "../services/activityService";
import LeadDAO from "../data/leadDAO";
import { SourceAction, EntityType } from "../types/activityTypes";
import { SourceCreateDTO, SourceUpdateDTO, SourceFilterUpdateDTO, Source, SourceResponse, CreateSourceResponse, RefreshTokenResponse } from "../types/sourceTypes";
import { requirePermission } from '../middleware/requirePermission';
import { SourcePermission } from '../types/permissionTypes';

/**
 * SourceResource - Admin API endpoints for source management
 * TICKET-046: CRUD operations for lead sources with API token management
 *
 * Security:
 * - Token only returned on create and refresh (one-time display)
 * - Token masked in all other responses
 * - Admin authentication required (middleware applied in AutomatorServer)
 */
@injectable()
export default class SourceResource {
    private readonly router: Router;

    constructor(
        private readonly sourceService: SourceService,
        private readonly activityService: ActivityService,
        private readonly leadDAO: LeadDAO
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/sources - Get all sources with pagination
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 50,
                    search: req.query.search as string | undefined,
                    includeDeleted: req.query.includeDeleted === 'true'
                };

                const result = await this.sourceService.getAll(filters);

                // Mask tokens in responses (never show except on create/refresh)
                const maskedItems = result.items.map(source => this.maskToken(source));

                res.status(200).json({
                    items: maskedItems,
                    count: result.count
                });
            } catch (error) {
                console.error('Error fetching sources:', error);
                res.status(500).json({
                    error: 'Failed to fetch sources',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // GET /api/sources/:id - Get source by ID
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const source = await this.sourceService.getById(id);

                if (!source) {
                    return res.status(404).json({ error: 'Source not found' });
                }

                // Mask token in response
                res.status(200).json(this.maskToken(source));
            } catch (error) {
                console.error('Error fetching source:', error);
                res.status(500).json({
                    error: 'Failed to fetch source',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // GET /api/sources/:id/lead-stats - Lead count for a source in a given month
        this.router.get('/:id/lead-stats', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const year = Number(req.query.year) || new Date().getFullYear();
                const month = Number(req.query.month) || (new Date().getMonth() + 1);
                const count = await this.leadDAO.getLeadCountBySourceAndMonth(id, year, month);
                res.status(200).json({ count, year, month });
            } catch (error) {
                console.error('Error fetching lead stats:', error);
                res.status(500).json({
                    error: 'Failed to fetch lead stats',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // POST /api/sources - Create new source (returns token once)
        this.router.post('/', requirePermission(SourcePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { name } = req.body;

                if (!name || name.trim().length === 0) {
                    return res.status(400).json({ error: 'Source name is required' });
                }

                const createDTO: SourceCreateDTO = { name };
                const source = await this.sourceService.create(createDTO);

                // Return full source including token (ONE-TIME DISPLAY)
                const response: CreateSourceResponse = {
                    id: source.id,
                    name: source.name,
                    lead_manager_id: source.lead_manager_id ?? null,
                    buyer_filter_mode: source.buyer_filter_mode ?? null,
                    buyer_filter_buyer_ids: source.buyer_filter_buyer_ids ?? [],
                    fb_page_id: source.fb_page_id ?? null,
                    fb_page_token: source.fb_page_token ?? null,
                    created: source.created,
                    modified: source.modified,
                    deleted: source.deleted,
                    token: source.token  // Only time token is returned
                };

                await this.activityService.log({
                    user_id: req.user?.id,
                    entity_type: EntityType.SOURCE,
                    entity_id: source.id,
                    action: SourceAction.CREATED,
                    action_details: { name: source.name }
                });

                res.status(201).json(response);
            } catch (error) {
                console.error('Error creating source:', error);
                res.status(500).json({
                    error: 'Failed to create source',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // PUT /api/sources/:id - Update source name
        this.router.put('/:id', requirePermission(SourcePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { name, lead_manager_id, fb_page_id, fb_page_token } = req.body;

                const updateDTO: SourceUpdateDTO = {};
                if (name) updateDTO.name = name;
                if ('lead_manager_id' in req.body) updateDTO.lead_manager_id = lead_manager_id ?? null;
                if ('fb_page_id' in req.body) updateDTO.fb_page_id = fb_page_id ?? null;
                if ('fb_page_token' in req.body) updateDTO.fb_page_token = fb_page_token ?? null;

                if (Object.keys(updateDTO).length === 0) {
                    return res.status(400).json({ error: 'No fields to update' });
                }

                const existingSource = await this.sourceService.getById(id);

                await this.sourceService.update(id, updateDTO);

                const source = await this.sourceService.getById(id);

                if (updateDTO.name !== undefined && updateDTO.name !== existingSource?.name) {
                    await this.activityService.log({
                        user_id: req.user?.id,
                        entity_type: EntityType.SOURCE,
                        entity_id: id,
                        action: SourceAction.UPDATED,
                        action_details: { name: updateDTO.name }
                    });
                }

                if ('lead_manager_id' in updateDTO && updateDTO.lead_manager_id !== existingSource?.lead_manager_id) {
                    await this.activityService.log({
                        user_id: req.user?.id,
                        entity_type: EntityType.SOURCE,
                        entity_id: id,
                        action: SourceAction.LEAD_MANAGER_ASSIGNED,
                        action_details: { lead_manager_name: source?.lead_manager_name ?? null }
                    });
                }

                // Mask token in response
                res.status(200).json(this.maskToken(source!));
            } catch (error) {
                console.error('Error updating source:', error);
                res.status(500).json({
                    error: 'Failed to update source',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // POST /api/sources/:id/refresh-token - Refresh API token
        this.router.post('/:id/refresh-token', requirePermission(SourcePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const source = await this.sourceService.refreshToken(id);

                // Return only ID and new token (ONE-TIME DISPLAY)
                const response: RefreshTokenResponse = {
                    id: source.id,
                    token: source.token  // New token returned once
                };

                await this.activityService.log({
                    user_id: req.user?.id,
                    entity_type: EntityType.SOURCE,
                    entity_id: id,
                    action: SourceAction.TOKEN_REFRESHED,
                    action_details: { name: source.name }
                });

                res.status(200).json(response);
            } catch (error) {
                console.error('Error refreshing token:', error);
                res.status(500).json({
                    error: 'Failed to refresh token',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // PATCH /api/sources/:id/buyer-filters - Update buyer routing filter
        this.router.patch('/:id/buyer-filters', requirePermission(SourcePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { mode, buyer_ids } = req.body as SourceFilterUpdateDTO;

                if (mode !== null && mode !== 'include' && mode !== 'exclude') {
                    return res.status(400).json({ error: "mode must be 'include', 'exclude', or null" });
                }
                if (!Array.isArray(buyer_ids)) {
                    return res.status(400).json({ error: 'buyer_ids must be an array' });
                }

                const source = await this.sourceService.updateBuyerFilter(id, mode, buyer_ids);

                await this.activityService.log({
                    user_id: req.user?.id,
                    entity_type: EntityType.SOURCE,
                    entity_id: id,
                    action: SourceAction.BUYER_FILTER_UPDATED,
                    action_details: { mode, buyer_ids }
                });

                res.status(200).json(this.maskToken(source));
            } catch (error) {
                console.error('Error updating buyer filter:', error);
                res.status(500).json({
                    error: 'Failed to update buyer filter',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // DELETE /api/sources/:id - Soft delete source
        this.router.delete('/:id', requirePermission(SourcePermission.MANAGE), async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                await this.sourceService.trash(id);

                res.status(204).send();
            } catch (error) {
                console.error('Error deleting source:', error);
                res.status(500).json({
                    error: 'Failed to delete source',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    /**
     * Mask token in response (show *** if token exists)
     * Token only shown on create and refresh endpoints
     */
    private maskToken(source: Source): SourceResponse {
        return {
            id: source.id,
            name: source.name,
            lead_manager_id: source.lead_manager_id ?? null,
            lead_manager_name: source.lead_manager_name,
            campaign_count: source.campaign_count,
            buyer_filter_mode: source.buyer_filter_mode ?? null,
            buyer_filter_buyer_ids: source.buyer_filter_buyer_ids ?? [],
            fb_page_id: source.fb_page_id ?? null,
            fb_page_token: source.fb_page_token ?? null,
            created: source.created,
            modified: source.modified,
            deleted: source.deleted
            // token intentionally omitted
        };
    }

    public routes(): Router {
        return this.router;
    }
}
