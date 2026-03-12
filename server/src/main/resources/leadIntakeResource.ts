import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';
import CampaignService from '../services/campaignService';
import CountyService from '../services/countyService';

const REQUIRED_FIELDS = ['address', 'city', 'state', 'zip'];

/**
 * LeadIntakeResource - API endpoint for external lead submission
 * TICKET-046: Updated to use source authentication and campaign tracking
 *
 * Authentication: Requires Bearer token (via ApiKeyAuthenticator middleware)
 * Source: Attached to req.source by authentication middleware
 * Campaign: Extracted from request body, auto-created if doesn't exist
 *
 * Payload format: Structured with lead/campaign/metadata/raw_payload
 */
@injectable()
export default class LeadIntakeResource {
    private readonly router: Router;

    constructor(
        private readonly leadService: LeadService,
        private readonly campaignService: CampaignService,
        private readonly countyService: CountyService
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

                const item = req.body;

                if (!item || typeof item !== 'object' || Array.isArray(item)) {
                    return res.status(400).json({
                        message: "Request body must be a single lead object"
                    });
                }

                if (!item.lead) {
                    return res.status(400).json({ message: "Request body must include a 'lead' object" });
                }

                const { lead, campaign: campaignInput, metadata, raw_payload } = item;
                let normalizedLead: { leadData: any; campaignKey: string; campaignData: any; rawPayload: any; };

                try {
                    const missingLeadFields = REQUIRED_FIELDS.filter(
                        f => !lead[f] || String(lead[f]).trim() === ""
                    );
                    if (missingLeadFields.length > 0) {
                        return res.status(400).json({
                            message: `Missing required lead fields: ${missingLeadFields.join(", ")}`
                        });
                    }

                    if (!lead.first_name || !lead.last_name) {
                        return res.status(400).json({
                            message: "first_name and last_name are required"
                        });
                    }

                    // County lookup by zip if not provided
                    let county = lead.county;
                    let countyId = lead.county_id;

                    if (!county && lead.zip) {
                        const foundCounty = await this.countyService.getByZipCode(lead.zip);
                        if (foundCounty) {
                            county = foundCounty.name;
                            countyId = foundCounty.id;
                        }
                    }

                    if (!county) {
                        return res.status(400).json({
                            message: `County could not be determined from zip ${lead.zip}`
                        });
                    }

                    const campaignKey = campaignInput?.external_campaign_id
                        ? `${campaignInput.platform}:${campaignInput.external_campaign_id}`
                        : campaignInput?.external_campaign_name || lead.first_name;

                    normalizedLead = {
                        leadData: {
                            first_name: lead.first_name,
                            last_name: lead.last_name,
                            email: lead.email,
                            phone: lead.phone,
                            address: lead.address,
                            city: lead.city,
                            state: lead.state,
                            zipcode: lead.zip,
                            county,
                            county_id: countyId,
                            external_lead_id: metadata?.external_lead_id,
                            external_ad_id: metadata?.external_ad_id,
                            external_ad_name: metadata?.external_ad_name
                        },
                        campaignKey,
                        campaignData: campaignInput || {},
                        rawPayload: raw_payload || item
                    };
                } catch (error) {
                    return res.status(400).json({
                        message: error instanceof Error ? error.message : "Invalid request body"
                    });
                }

                const { campaignData, campaignKey } = normalizedLead;

                const resolvedCampaign = campaignData.external_campaign_id
                    ? await this.campaignService.getOrCreateByExternal(
                        source.id,
                        campaignData,
                        campaignData.external_campaign_name || campaignKey
                    )
                    : await this.campaignService.getOrCreate(source.id, campaignKey);

                const result = await this.leadService.importLeadsFromApi(
                    [{
                        ...normalizedLead.leadData,
                        source_id: source.id,
                        campaign_id: resolvedCampaign.id,
                        raw_payload: normalizedLead.rawPayload
                    }],
                    source.id,
                    resolvedCampaign.id
                );

                return res.status(200).json({
                    imported: result.imported,
                    failed: result.failed,
                    errors: result.errors
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
