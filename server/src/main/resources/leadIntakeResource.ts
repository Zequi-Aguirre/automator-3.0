import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';
import CampaignService from '../services/campaignService';
import { ApiLeadPayload } from '../types/leadTypes';

const REQUIRED_FIELDS: (keyof ApiLeadPayload)[] = ['address', 'city', 'state', 'county'];

/**
 * LeadIntakeResource - API endpoint for external lead submission
 * TICKET-046: Updated to use source authentication and campaign tracking
 *
 * Authentication: Requires Bearer token (via ApiKeyAuthenticator middleware)
 * Source: Attached to req.source by authentication middleware
 * Campaign: Extracted from request body, auto-created if doesn't exist
 */
@injectable()
export default class LeadIntakeResource {
    private readonly router: Router;

    constructor(
        private readonly leadService: LeadService,
        private readonly campaignService: CampaignService
    ) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/", async (req: Request, res: Response) => {
            try {
                // TICKET-046: Get authenticated source from middleware
                const source = req.source;
                if (!source) {
                    return res.status(401).json({
                        message: "Authentication required - source not found in request"
                    });
                }

                const body = req.body;

                if (!Array.isArray(body) || body.length === 0) {
                    return res.status(400).json({
                        message: "Request body must be a non-empty array of lead objects"
                    });
                }

                // Validate required fields on each payload
                const validationErrors: string[] = [];
                for (let i = 0; i < body.length; i++) {
                    const item = body[i];

                    // Check for campaign_name on each lead
                    if (!item.campaign_name || String(item.campaign_name).trim() === "") {
                        validationErrors.push(`Item ${i}: campaign_name is required`);
                    }

                    const missing = REQUIRED_FIELDS.filter(f => !item[f] || String(item[f]).trim() === "");
                    if (missing.length > 0) {
                        validationErrors.push(`Item ${i}: missing required fields: ${missing.join(", ")}`);
                    }
                }

                if (validationErrors.length > 0) {
                    return res.status(400).json({
                        message: "Validation failed",
                        errors: validationErrors
                    });
                }

                // TICKET-046: Process each lead with its own campaign
                // Group leads by campaign_name to minimize campaign lookups
                const leadsByCampaign = new Map<string, ApiLeadPayload[]>();

                for (const lead of body) {
                    const campaignName = lead.campaign_name.trim();
                    if (!leadsByCampaign.has(campaignName)) {
                        leadsByCampaign.set(campaignName, []);
                    }
                    leadsByCampaign.get(campaignName)!.push(lead);
                }

                // Process each campaign group
                let totalImported = 0;
                let totalFailed = 0;
                const allErrors: string[] = [];

                for (const [campaignName, campaignLeads] of leadsByCampaign.entries()) {
                    // Get or create campaign for this source
                    const campaign = await this.campaignService.getOrCreate(source.id, campaignName);

                    // Import leads for this campaign
                    const result = await this.leadService.importLeadsFromApi(
                        campaignLeads,
                        source.id,
                        campaign.id
                    );

                    totalImported += result.imported;
                    totalFailed += result.failed;
                    allErrors.push(...result.errors);
                }

                return res.status(200).json({
                    imported: totalImported,
                    failed: totalFailed,
                    errors: allErrors
                });
            } catch (error) {
                console.error("Error handling lead intake:", error);
                return res.status(500).json({
                    message: "Failed to process lead intake",
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
