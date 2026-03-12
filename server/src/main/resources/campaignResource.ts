import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import CampaignService from "../services/campaignService";
import SourceService from "../services/sourceService";
import LeadManagerService from "../services/leadManagerService";
import ActivityService from "../services/activityService";
import { CampaignAction, EntityType } from "../types/activityTypes";
import { CampaignCreateDTO, CampaignUpdateDTO } from "../types/campaignTypes";

/**
 * CampaignResource - Admin API endpoints for campaign management
 * TICKET-046: Updated to use sources instead of affiliates
 *
 * Campaigns track marketing campaigns for lead sources.
 * Campaign names are unique within a source but can duplicate across sources.
 *
 * Admin authentication required (middleware applied in AutomatorServer)
 */
@injectable()
export default class CampaignResource {
    private readonly router: Router;

    constructor(
        private readonly campaignService: CampaignService,
        private readonly sourceService: SourceService,
        private readonly leadManagerService: LeadManagerService,
        private readonly activityService: ActivityService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // GET /api/campaigns - Get all campaigns with pagination
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 50,
                    source_id: req.query.source_id as string | undefined,
                    search: req.query.search as string | undefined,
                    includeDeleted: req.query.includeDeleted === 'true'
                };

                const result = await this.campaignService.getAll(filters);

                res.status(200).json({
                    items: result.items,
                    count: result.count
                });
            } catch (error) {
                console.error('Error fetching campaigns:', error);
                res.status(500).json({
                    error: 'Failed to fetch campaigns',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // GET /api/campaigns/source/:sourceId - Get campaigns for specific source
        this.router.get('/source/:sourceId', async (req: Request, res: Response) => {
            try {
                const { sourceId } = req.params;
                const campaigns = await this.campaignService.getBySourceId(sourceId);

                res.status(200).json({ campaigns });
            } catch (error) {
                console.error('Error fetching campaigns for source:', error);
                res.status(500).json({
                    error: 'Failed to fetch campaigns',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // GET /api/campaigns/:id - Get campaign by ID
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const campaign = await this.campaignService.getById(id);

                if (!campaign) {
                    return res.status(404).json({ error: 'Campaign not found' });
                }

                res.status(200).json(campaign);
            } catch (error) {
                console.error('Error fetching campaign:', error);
                res.status(500).json({
                    error: 'Failed to fetch campaign',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // POST /api/campaigns - Create new campaign
        // TICKET-047: Updated to support external platform tracking
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const {
                    source_id,
                    name,
                    blacklisted,
                    rating,
                    platform,
                    external_campaign_id,
                    external_campaign_name,
                    external_form_id,
                    external_adset_id,
                    external_adset_name
                } = req.body;

                if (!source_id || source_id.trim().length === 0) {
                    return res.status(400).json({ error: 'Source ID is required' });
                }

                if (!name || name.trim().length === 0) {
                    return res.status(400).json({ error: 'Campaign name is required' });
                }

                const createDTO: CampaignCreateDTO = {
                    source_id,
                    name,
                    blacklisted: blacklisted || false,
                    rating: rating || 3,  // TICKET-047: Default to 3 instead of 0
                    // TICKET-047: Optional external tracking fields
                    platform,
                    external_campaign_id,
                    external_campaign_name,
                    external_form_id,
                    external_adset_id,
                    external_adset_name
                };

                const campaign = await this.campaignService.create(createDTO);

                res.status(201).json(campaign);
            } catch (error) {
                console.error('Error creating campaign:', error);

                // Check for duplicate campaign name
                if (error instanceof Error && error.message.includes('already exists')) {
                    return res.status(409).json({
                        error: 'Campaign already exists',
                        message: error.message
                    });
                }

                res.status(500).json({
                    error: 'Failed to create campaign',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // PUT /api/campaigns/:id - Update campaign
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const { name, blacklisted, rating } = req.body;

                const updateDTO: CampaignUpdateDTO = {};
                if (name !== undefined) updateDTO.name = name;
                if (blacklisted !== undefined) updateDTO.blacklisted = blacklisted;
                if (rating !== undefined) updateDTO.rating = rating;

                if (Object.keys(updateDTO).length === 0) {
                    return res.status(400).json({ error: 'No fields to update' });
                }

                const campaign = await this.campaignService.update(id, updateDTO);

                res.status(200).json(campaign);
            } catch (error) {
                console.error('Error updating campaign:', error);

                // Check for duplicate campaign name
                if (error instanceof Error && error.message.includes('already exists')) {
                    return res.status(409).json({
                        error: 'Campaign already exists',
                        message: error.message
                    });
                }

                res.status(500).json({
                    error: 'Failed to update campaign',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // DELETE /api/campaigns/:id - Soft delete campaign
        this.router.delete('/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                await this.campaignService.trash(id);

                res.status(204).send();
            } catch (error) {
                console.error('Error deleting campaign:', error);
                res.status(500).json({
                    error: 'Failed to delete campaign',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Admin list endpoint — returns campaigns with sources and managers for table display
        this.router.get("/admin/get-many", async (req: Request, res: Response) => {
            try {
                const filters = {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 10,
                    source_id: undefined,
                    search: undefined,
                    includeDeleted: false
                };
                const [result, sources, managers] = await Promise.all([
                    this.campaignService.getAll(filters),
                    this.sourceService.getAll({ page: 1, limit: 1000 }),
                    this.leadManagerService.getActive()
                ]);

                res.status(200).send({
                    campaigns: result.items,
                    count: result.count,
                    sources: sources.items,
                    managers
                });
            } catch (error) {
                console.error('Error in get-many campaigns:', error);
                res.status(500).send({
                    message: 'Failed to fetch campaigns',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        this.router.patch("/admin/update-meta/:campaignId", async (req: Request, res: Response) => {
            const { campaignId } = req.params;
            const updates = req.body;
            const updated = await this.campaignService.updateCampaignMeta(campaignId, updates);

            if (updates.lead_manager_id !== undefined) {
                await this.activityService.log({
                    user_id: req.user?.id,
                    entity_type: EntityType.CAMPAIGN,
                    entity_id: campaignId,
                    action: CampaignAction.MANAGER_ASSIGNED,
                    action_details: { lead_manager_id: updates.lead_manager_id }
                });
            }

            res.status(200).send(updated);
        });
    }

    public routes(): Router {
        return this.router;
    }
}