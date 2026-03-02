import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { ApiLeadPayload, Lead, LeadFilters, parsedLeadFromCSV } from "../types/leadTypes";
import { parseCsvToLeads, splitName, cleanPhone, cleanState } from "../middleware/parseCsvToLeads.ts";
import CountyService from "../services/countyService.ts";
import SourceService from "../services/sourceService.ts";
import CampaignService from "../services/campaignService.ts";
import LeadFormInputDAO from "../data/leadFormInputDAO.ts";
import SendLogDAO from "../data/sendLogDAO.ts";
import { County } from "../types/countyTypes.ts";
import BuyerDAO from "../data/buyerDAO.ts";
import BuyerDispatchService from "./buyerDispatchService.ts";
import LeadBuyerOutcomeDAO from "../data/leadBuyerOutcomeDAO.ts";

type LeadTrashReason =
    | "BLACKLISTED_COUNTY"
    | "COUNTY_COOLDOWN"
    | "EXPIRED_18_HOURS"
    | "MANUAL_USER_DELETE";

@injectable()
export default class LeadService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadFormInputDAO: LeadFormInputDAO,
        private readonly countyService: CountyService,
        private readonly sourceService: SourceService,
        private readonly campaignService: CampaignService,
        private readonly sendLogDAO: SendLogDAO,
        private readonly buyerDAO: BuyerDAO,
        private readonly buyerDispatchService: BuyerDispatchService,
        private readonly leadBuyerOutcomeDAO: LeadBuyerOutcomeDAO
    ) {}

    // CSV Import Source Management
    private async ensureCsvSource(): Promise<{ sourceId: string; campaignId: string }> {
        const CSV_SOURCE_NAME = "CSV_IMPORT";
        const CSV_CAMPAIGN_NAME = "Default CSV Campaign";
        const CSV_EMAIL = "csv@import.internal";

        // Check if CSV_IMPORT source exists
        const sources = await this.sourceService.getAll({ page: 1, limit: 100 });
        let csvSource = sources.items.find(s => s.name === CSV_SOURCE_NAME);

        // Create if doesn't exist
        if (!csvSource) {
            csvSource = await this.sourceService.create({
                name: CSV_SOURCE_NAME,
                email: CSV_EMAIL
            });
            console.info('Created CSV_IMPORT source', { id: csvSource.id });
        }

        // Get or create campaign
        const campaign = await this.campaignService.getOrCreate(csvSource.id, CSV_CAMPAIGN_NAME);

        return {
            sourceId: campaign.source_id!,
            campaignId: campaign.id
        };
    }

    // Lead Management Methods
    async getLeadById(leadId: string): Promise<Lead | null> {
        try {
            return await this.leadDAO.getById(leadId);
        } catch (error) {
            console.error("Error fetching lead by ID:", {
                leadId,
                error: error instanceof Error ? error.message : "Unknown error"
            });

            throw new Error(
                `Failed to fetch lead ${leadId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    async updateLead(leadId: string, leadData: Partial<Lead>): Promise<Lead> {
        return await this.leadDAO.updateLead(leadId, leadData);
    }

    async trashLead(leadId: string, reason: LeadTrashReason = "MANUAL_USER_DELETE"): Promise<Lead> {
        try {
            const lead = await this.leadDAO.getById(leadId);
            if (!lead) {
                throw new Error("Lead not found");
            }

            // Hard block: sent leads cannot be trashed
            if (lead.sent) {
                throw new Error("Lead already sent");
            }

            return await this.leadDAO.trashLeadWithReason(leadId, reason);

        } catch (error) {
            console.error("Error during lead trash process:", error);
            throw new Error(
                error instanceof Error ? error.message : "Failed to trash lead"
            );
        }
    }

    async getMany(filters: LeadFilters): Promise<{ leads: Lead[]; count: number }> {
        try {
            return await this.leadDAO.getMany(filters);
        } catch (error) {
            console.error("Error fetching leads:", error);
            throw new Error(
                `Failed to fetch leads: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    async verifyLead(leadId: string): Promise<Lead> {
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) {
            throw new Error("Lead not found");
        }
        if (lead.sent) {
            throw new Error("Lead already sent");
        }
        if (lead.verified) {
            throw new Error("Lead is already verified");
        }

        const form = await this.leadFormInputDAO.getByLeadId(leadId);
        if (!form) {
            throw new Error("Missing form for lead");
        }

        const REQUIRED_FIELDS = [
            "form_multifamily",
            "form_repairs",
            "form_occupied",
            "form_sell_fast",
            "form_goal",
            "form_owner",
            "form_owned_years",
            "form_listed",
            'form_bedrooms',
            'form_bathrooms'
        ];

        const formObj = form as unknown as Record<string, any>;

        const missing: string[] = REQUIRED_FIELDS.filter(
            f => !formObj[f] || String(formObj[f]).trim() === ""
        );

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        return await this.leadDAO.verifyLead(leadId);
    }

    async unverifyLead(leadId: string): Promise<Lead> {
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) {
            throw new Error("Lead not found");
        }
        if (lead.sent) {
            throw new Error("Lead already sent");
        }
        if (!lead.verified) {
            throw new Error("Lead is not verified");
        }

        return await this.leadDAO.unverifyLead(leadId);
    }

    async importLeads(csvContent: string) {
        const { leads } = parseCsvToLeads(csvContent);

        // Get or create CSV_IMPORT source and campaign
        const { sourceId, campaignId } = await this.ensureCsvSource();

        // Match leads to existing counties using fuzzy matching (no auto-create)
        const countyMap = await this.countyService.matchLeadsToCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];
        const errors: string[] = [];
        let rejectedCount = 0;

        for (const lead of leads) {
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);

            // County is required - reject leads with no county match
            if (!county) {
                rejectedCount++;
                errors.push(`Lead rejected: Unknown county "${lead.county}, ${lead.state}" (no match found)`);
                continue;
            }

            lead.county_id = county.id;
            lead.county = county.name; // Use standardized county name
            lead.investor_id = null;
            lead.source_id = sourceId;
            lead.campaign_id = campaignId;

            resolvedLeads.push(lead);
        }

        if (resolvedLeads.length === 0) {
            return {
                imported: 0,
                rejected: rejectedCount,
                trashed: 0,
                errors: errors.length > 0 ? errors : ["No valid leads to import after county matching"]
            };
        }

        // Build maps by ID for filtering logic
        const countiesById = new Map<string, County>();
        countyMap.forEach((c: County) => {
            countiesById.set(c.id, c);
        });

        // SETTINGS
        // Note: Cooldowns are now per-buyer (not global) and apply during send, not import
        // Disable cooldown checks during import (set to 0)
        const delaySameCountyMs = 0;

        // LOGS FOR COOLDOWNS
        const countyIds = [...new Set(resolvedLeads.map(l => l.county_id!))];
        const recentCountyLogs = await this.sendLogDAO.getLatestLogsByCountyIds(countyIds);

        const countyLogsByCountyId = new Map<string, any>();
        for (const log of recentCountyLogs) {
            if (log.county_id) {
                countyLogsByCountyId.set(log.county_id, log);
            }
        }

        const survivors: parsedLeadFromCSV[] = [];
        // errors array already declared above for county matching failures
        let trashedCount = 0;

        for (const lead of resolvedLeads) {
            const reason = this.getTrashReasonForImport(
                lead,
                {
                    countiesById,
                    countyLogsByCountyId,
                    delaySameCountyMs
                }
            );

            if (reason) {
                try {
                    await this.leadDAO.createTrashedLead(lead, reason);
                    trashedCount++;
                } catch (e) {
                    errors.push(
                        e instanceof Error
                            ? `Failed to insert trashed lead (${reason}): ${e.message}`
                            : "Failed to insert trashed lead (unknown error)"
                    );
                }
            } else {
                survivors.push(lead);
            }
        }

        const insertResults = await this.leadDAO.createLeads(survivors);

        const successCount = insertResults.filter(r => r.success).length;
        const failedInsertCount = insertResults.length - successCount;

        errors.push(
            ...insertResults
                .filter(r => !r.success)
                .map(r => r.error || "Unknown error")
        );

        return {
            imported: successCount,
            rejected: rejectedCount + trashedCount + failedInsertCount,
            trashed: trashedCount,
            errors
        };
    }

    /**
     * Import leads from API with source and campaign tracking
     * TICKET-046: Updated to accept source_id and campaign_id
     */
    async importLeadsFromApi(
        payloads: ApiLeadPayload[],
        source_id?: string,
        campaign_id?: string
    ) {
        const leads: parsedLeadFromCSV[] = payloads.map(p => {
            // TICKET-046: Support both formats: first_name/last_name OR combined name
            let first_name: string;
            let last_name: string;

            if (p.first_name || p.last_name) {
                // Use provided first_name/last_name if available
                first_name = p.first_name || "";
                last_name = p.last_name || "";
            } else {
                // Fall back to splitting combined name field
                const split = splitName(p.name || "");
                first_name = split.first_name;
                last_name = split.last_name;
            }

            const phone = cleanPhone(p.phone || "");
            const email = (p.email || "").toLowerCase();

            return {
                name: `${first_name} ${last_name}`.trim(),
                first_name,
                last_name,
                phone,
                email,
                address: p.address,
                city: p.city,
                state: cleanState(p.state || ""),
                zipcode: p.zipcode || p.zip_code || "",  // Support both zipcode and zip_code
                county: p.county || "",
                county_id: undefined,
                private_notes: p.private_note || null,
                investor_id: null,
                source_id: source_id || null,  // TICKET-046: Associate with source
                campaign_id: campaign_id || null,  // TICKET-046: Associate with campaign
            };
        });

        // Match leads to existing counties using fuzzy matching (no auto-create)
        const countyMap = await this.countyService.matchLeadsToCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];
        const resolvedPayloads: ApiLeadPayload[] = [];
        const errors: string[] = [];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);

            if (!county) {
                errors.push(`Lead rejected: Unknown county "${lead.county}, ${lead.state}" (no match found)`);
                continue;
            }

            lead.county_id = county.id;
            lead.county = county.name; // Use standardized county name
            resolvedLeads.push(lead);
            resolvedPayloads.push(payloads[i]);
        }

        if (resolvedLeads.length === 0) {
            return {
                imported: 0,
                failed: payloads.length,
                errors: errors.length > 0 ? errors : ["No valid leads to import after resolving references"]
            };
        }

        const insertResults = await this.leadDAO.createLeads(resolvedLeads);

        // Create form input records for successfully inserted leads
        for (let i = 0; i < insertResults.length; i++) {
            const result = insertResults[i];
            if (result.success && result.lead) {
                const originalPayload = resolvedPayloads[i];
                try {
                    await this.leadFormInputDAO.create({
                        lead_id: result.lead.id,
                        form_sell_fast: originalPayload.sell_timeline || null,
                        form_repairs: originalPayload.repairs_needed || null,
                        form_goal: originalPayload.sell_motivation || null,
                    });
                } catch (e) {
                    errors.push(
                        `Lead created but form input failed for ${result.lead.id}: ${
                            e instanceof Error ? e.message : "Unknown error"
                        }`
                    );
                }
            }
        }

        // Auto-send to buyers with auto_send=true
        const autoSendBuyers = await this.buyerDAO.getAutoSendBuyers();
        if (autoSendBuyers.length > 0) {
            const successfulLeads = insertResults
                .filter(r => r.success && r.lead)
                .map(r => r.lead!);

            for (const lead of successfulLeads) {
                for (const buyer of autoSendBuyers) {
                    try {
                        await this.buyerDispatchService.sendLeadToBuyer(lead, buyer);
                    } catch (e) {
                        // Log auto-send errors but don't fail the import
                        console.error(`Auto-send failed for lead ${lead.id} to buyer ${buyer.name}:`, e);
                        errors.push(
                            `Auto-send to ${buyer.name} failed for lead ${lead.id}: ${
                                e instanceof Error ? e.message : "Unknown error"
                            }`
                        );
                    }
                }
            }
        }

        const successCount = insertResults.filter(r => r.success).length;
        errors.push(
            ...insertResults
                .filter(r => !r.success)
                .map(r => r.error || "Unknown insert error")
        );

        return {
            imported: successCount,
            failed: payloads.length - successCount,
            errors
        };
    }

    private getTrashReasonForImport(
        _lead: parsedLeadFromCSV,
        _deps: {
            countiesById: Map<string, County>;
            countyLogsByCountyId: Map<string, any>;
            delaySameCountyMs: number;
        }
    ): LeadTrashReason | null {

        // NOTE: County blacklists and cooldowns are now per-buyer, not global
        // They are checked during the SEND phase (buyerDispatchService), not during IMPORT
        // All leads should be imported successfully regardless of county blacklist/whitelist status

        // No trash reasons during import - all valid leads should be imported
        return null;
    }

    // ========================================
    // Buyer Dispatch & History Methods
    // ========================================

    /**
     * Send lead to specific buyer (manual send)
     * Delegates to BuyerDispatchService for validation and dispatch
     */
    async sendLeadToBuyer(leadId: string, buyerId: string) {
        // Get lead and buyer
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) {
            throw new Error(`Lead ${leadId} not found`);
        }

        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) {
            throw new Error(`Buyer ${buyerId} not found`);
        }

        // Delegate to BuyerDispatchService
        return await this.buyerDispatchService.sendLeadToBuyer(lead, buyer);
    }

    /**
     * Get buyer send history for a lead
     * Returns all buyers with their send status for this lead
     */
    async getBuyerSendHistory(leadId: string) {
        // Get all buyers sorted by priority
        const allBuyers = await this.buyerDAO.getByPriority();

        // Get send logs for this lead grouped by buyer
        const sendLogs = await this.sendLogDAO.getByLeadIdGroupedByBuyer(leadId);

        // Map buyers to send history
        const history = allBuyers.map(buyer => {
            // Find send logs for this buyer
            const buyerLogs = sendLogs.filter(log => log.buyer_id === buyer.id);

            return {
                buyer_id: buyer.id,
                buyer_name: buyer.name,
                buyer_priority: buyer.priority,
                dispatch_mode: buyer.dispatch_mode,
                sends: buyerLogs.map(log => ({
                    id: log.id,
                    status: log.status,
                    response_code: log.response_code,
                    created: log.created
                })),
                total_sends: buyerLogs.length,
                last_sent_at: buyerLogs.length > 0 ? buyerLogs[0].created : null
            };
        });

        return history;
    }

    /**
     * Enable worker processing for a lead
     * Sets worker_enabled=true so worker can process this lead
     */
    async enableWorker(leadId: string): Promise<Lead> {
        return await this.leadDAO.enableWorker(leadId);
    }

    /**
     * Mark lead as sold to buyer
     * Creates lead_buyer_outcome record with status='sold'
     */
    async markSoldToBuyer(
        leadId: string,
        buyerId: string,
        soldPrice?: number
    ) {
        // Verify lead and buyer exist
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) {
            throw new Error(`Lead ${leadId} not found`);
        }

        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) {
            throw new Error(`Buyer ${buyerId} not found`);
        }

        // Check if outcome already exists
        const existing = await this.leadBuyerOutcomeDAO.getByLeadAndBuyer(leadId, buyerId);
        if (existing) {
            // Update existing outcome
            return await this.leadBuyerOutcomeDAO.update(existing.id, {
                status: 'sold',
                sold_at: new Date(),
                sold_price: soldPrice || null
            });
        }

        // Create new outcome record
        return await this.leadBuyerOutcomeDAO.create({
            lead_id: leadId,
            buyer_id: buyerId,
            status: 'sold',
            sold_at: new Date(),
            sold_price: soldPrice || null
        });
    }
}