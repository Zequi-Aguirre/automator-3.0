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

                // TICKET-046: Extract campaign name from request body
                // Expecting { campaign_name: string, leads: ApiLeadPayload[] }
                // OR just ApiLeadPayload[] with campaign_name on first item
                let campaignName: string | undefined;
                let leads: ApiLeadPayload[];

                if (body[0] && 'campaign_name' in body[0]) {
                    // Campaign name on each lead
                    campaignName = body[0].campaign_name;
                    leads = body;
                } else {
                    // No campaign specified - use default
                    campaignName = 'Default';
                    leads = body;
                }

                if (!campaignName || campaignName.trim().length === 0) {
                    return res.status(400).json({
                        message: "campaign_name is required"
                    });
                }

                // Validate required fields on each payload
                const validationErrors: string[] = [];
                for (let i = 0; i < leads.length; i++) {
                    const item = leads[i];
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

                // TICKET-046: Get or create campaign for this source
                const campaign = await this.campaignService.getOrCreate(source.id, campaignName);

                // Import leads with source and campaign association
                const result = await this.leadService.importLeadsFromApi(
                    leads as ApiLeadPayload[],
                    source.id,
                    campaign.id
                );

                return res.status(200).json(result);
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
