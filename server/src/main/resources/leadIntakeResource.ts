import express, { Request, Response, Router } from 'express';
import { injectable } from "tsyringe";
import LeadService from '../services/leadService';
import CampaignService from '../services/campaignService';
import CountyService from '../services/countyService';

// TICKET-047: Required fields updated for new structured format
// county is now optional (can be looked up by zip)
const REQUIRED_FIELDS_LEGACY = ['address', 'city', 'state', 'county', 'campaign_name'];
const REQUIRED_FIELDS_NEW = ['address', 'city', 'state', 'zip'];

/**
 * LeadIntakeResource - API endpoint for external lead submission
 * TICKET-046: Updated to use source authentication and campaign tracking
 * TICKET-047: Updated to support structured payload with external tracking
 *
 * Authentication: Requires Bearer token (via ApiKeyAuthenticator middleware)
 * Source: Attached to req.source by authentication middleware
 * Campaign: Extracted from request body, auto-created if doesn't exist
 *
 * Supports two payload formats:
 * 1. NEW (preferred): Structured with lead/campaign/metadata/raw_payload
 * 2. LEGACY: Flat structure with campaign_name (backwards compatible)
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

                const isNewFormat = !!item.lead;
                let normalizedLead: { leadData: any; campaignKey: string; campaignData: any; rawPayload: any; };

                try {
                    if (isNewFormat) {
                        // NEW STRUCTURED FORMAT
                        const { lead, campaign, metadata, raw_payload } = item;

                        const missingLeadFields = REQUIRED_FIELDS_NEW.filter(
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

                        const campaignKey = campaign?.external_campaign_id
                            ? `${campaign.platform}:${campaign.external_campaign_id}`
                            : campaign?.external_campaign_name || lead.first_name;

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
                                external_ad_name: metadata?.external_ad_name,
                                private_note: lead.private_note
                            },
                            campaignKey,
                            campaignData: campaign || {},
                            rawPayload: raw_payload || item
                        };

                    } else {
                        // LEGACY FLAT FORMAT (backwards compatible)
                        if (!item.campaign_name || String(item.campaign_name).trim() === "") {
                            return res.status(400).json({ message: "campaign_name is required in legacy format" });
                        }

                        const missingFields = REQUIRED_FIELDS_LEGACY.filter(
                            f => !item[f] || String(item[f]).trim() === ""
                        );
                        if (missingFields.length > 0) {
                            return res.status(400).json({
                                message: `Missing required fields: ${missingFields.join(", ")}`
                            });
                        }

                        let firstName = item.first_name || "";
                        let lastName = item.last_name || "";

                        if (!firstName && !lastName && item.name) {
                            const nameParts = item.name.trim().split(" ");
                            firstName = nameParts[0] || "";
                            lastName = nameParts.slice(1).join(" ") || "";
                        }

                        normalizedLead = {
                            leadData: {
                                first_name: firstName,
                                last_name: lastName,
                                email: item.email,
                                phone: item.phone,
                                address: item.address,
                                city: item.city,
                                state: item.state,
                                zipcode: item.zip_code,
                                county: item.county,
                                private_notes: item.private_note
                            },
                            campaignKey: item.campaign_name.trim(),
                            campaignData: {},
                            rawPayload: null
                        };
                    }
                } catch (error) {
                    return res.status(400).json({
                        message: error instanceof Error ? error.message : "Invalid request body"
                    });
                }

                const { campaignData, campaignKey } = normalizedLead;

                const campaign = campaignData.external_campaign_id
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
                        campaign_id: campaign.id,
                        raw_payload: normalizedLead.rawPayload
                    }],
                    source.id,
                    campaign.id
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
