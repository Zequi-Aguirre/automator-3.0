import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import SourceService from "../services/sourceService";
import { SourceCreateDTO, SourceUpdateDTO, Source, SourceResponse, CreateSourceResponse, RefreshTokenResponse } from "../types/sourceTypes";

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

    constructor(private readonly sourceService: SourceService) {
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

        // POST /api/sources - Create new source (returns token once)
        this.router.post('/', async (req: Request, res: Response) => {
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
                    created: source.created,
                    modified: source.modified,
                    deleted: source.deleted,
                    token: source.token  // Only time token is returned
                };

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
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { name } = req.body;

                const updateDTO: SourceUpdateDTO = {};
                if (name) updateDTO.name = name;

                if (Object.keys(updateDTO).length === 0) {
                    return res.status(400).json({ error: 'No fields to update' });
                }

                const source = await this.sourceService.update(id, updateDTO);

                // Mask token in response
                res.status(200).json(this.maskToken(source));
            } catch (error) {
                console.error('Error updating source:', error);
                res.status(500).json({
                    error: 'Failed to update source',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // POST /api/sources/:id/refresh-token - Refresh API token
        this.router.post('/:id/refresh-token', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const source = await this.sourceService.refreshToken(id);

                // Return only ID and new token (ONE-TIME DISPLAY)
                const response: RefreshTokenResponse = {
                    id: source.id,
                    token: source.token  // New token returned once
                };

                res.status(200).json(response);
            } catch (error) {
                console.error('Error refreshing token:', error);
                res.status(500).json({
                    error: 'Failed to refresh token',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // DELETE /api/sources/:id - Soft delete source
        this.router.delete('/:id', async (req: Request, res: Response) => {
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
