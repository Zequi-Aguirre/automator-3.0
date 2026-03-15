import { injectable } from "tsyringe";
import { LeadAction } from "../types/activityTypes";
import LeadDAO from "../data/leadDAO";
import { Lead, LeadFilters, parsedLeadFromCSV } from "../types/leadTypes";
import { parseCsvToLeads, cleanPhone, cleanState } from "../middleware/parseCsvToLeads.ts";
import CountyService from "../services/countyService.ts";
import SourceService from "../services/sourceService.ts";
import CampaignService from "../services/campaignService.ts";
import LeadFormInputDAO from "../data/leadFormInputDAO.ts";
import SendLogDAO from "../data/sendLogDAO.ts";
import { County } from "../types/countyTypes.ts";
import { SendLog } from "../types/sendLogTypes.ts";
import BuyerDAO from "../data/buyerDAO.ts";
import BuyerDispatchService from "./buyerDispatchService.ts";
import LeadBuyerOutcomeDAO from "../data/leadBuyerOutcomeDAO.ts";
import ActivityService from "./activityService.ts";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";

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
        private readonly leadBuyerOutcomeDAO: LeadBuyerOutcomeDAO,
        private readonly activityService: ActivityService,
        private readonly workerSettingsDAO: WorkerSettingsDAO
    ) {}

    // CSV Import Source Management
    private async ensureCsvSource(): Promise<{ sourceId: string; campaignId: string }> {
        const CSV_SOURCE_NAME = "CSV_IMPORT";
        const CSV_CAMPAIGN_NAME = "Default CSV Campaign";

        // Check if CSV_IMPORT source exists
        const sources = await this.sourceService.getAll({ page: 1, limit: 100 });
        let csvSource = sources.items.find(s => s.name === CSV_SOURCE_NAME);

        // Create if doesn't exist
        if (!csvSource) {
            csvSource = await this.sourceService.create({ name: CSV_SOURCE_NAME });
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
            return await this.leadDAO.getByIdAny(leadId);
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

    async updateLead(leadId: string, leadData: Partial<Lead>, userId?: string | null): Promise<Lead> {
        const updated = await this.leadDAO.updateLead(leadId, leadData);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.UPDATED });
        return updated;
    }

    async trashLead(leadId: string, reason: LeadTrashReason = "MANUAL_USER_DELETE", userId?: string | null, userReason?: string | null): Promise<Lead> {
        try {
            const lead = await this.leadDAO.getById(leadId);
            if (!lead) {
                throw new Error("Lead not found");
            }

            // Hard block: sent leads cannot be trashed
            if (lead.sent) {
                throw new Error("Lead already sent");
            }

            const storedReason = userReason ?? reason;
            const trashed = await this.leadDAO.trashLeadWithReason(leadId, storedReason);
            await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.TRASHED, action_details: { reason: storedReason } });
            return trashed;

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

    async verifyLead(leadId: string, userId?: string | null): Promise<Lead> {
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

        const formObj = form as unknown as Record<string, unknown>;

        const missing: string[] = REQUIRED_FIELDS.filter(
            f => !formObj[f] || String(formObj[f]).trim() === ""
        );

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(", ")}`);
        }

        const verified = await this.leadDAO.verifyLead(leadId);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.VERIFIED });

        // Auto-queue if enabled in settings and not already queued
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        if (settings.auto_queue_on_verify && !verified.queued) {
            const queued = await this.leadDAO.queueLead(leadId);
            await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.AUTO_QUEUED });
            return queued;
        }

        return verified;
    }

    async unverifyLead(leadId: string, userId?: string | null): Promise<Lead> {
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

        const unverified = await this.leadDAO.unverifyLead(leadId);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.UNVERIFIED });
        return unverified;
    }

    async importLeads(csvContent: string, userId?: string | null) {
        const { leads } = parseCsvToLeads(csvContent);

        // Get or create CSV_IMPORT source and campaign
        const { sourceId, campaignId } = await this.ensureCsvSource();

        // Match leads to existing counties using fuzzy matching (no auto-create)
        const countyMap = await this.countyService.matchLeadsToCounties(leads);

        type RejectedLead = parsedLeadFromCSV & { rejection_reason: string };
        const resolvedLeads: parsedLeadFromCSV[] = [];
        const rejectedLeads: RejectedLead[] = [];
        const errors: string[] = [];
        let rejectedCount = 0;

        for (const lead of leads) {
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);

            // County is required - reject leads with no county match
            if (!county) {
                rejectedCount++;
                const reason = `Unknown county: ${lead.county}, ${lead.state}`;
                errors.push(`Lead rejected: ${reason} (no match found)`);
                rejectedLeads.push({ ...lead, rejection_reason: reason });
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
                errors: errors.length > 0 ? errors : ["No valid leads to import after county matching"],
                rejectedLeads
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

        const countyLogsByCountyId = new Map<string, SendLog>();
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

        insertResults.forEach((r, i) => {
            if (!r.success) {
                const reason = r.error ?? 'Insert failed';
                errors.push(reason);
                rejectedLeads.push({ ...survivors[i], rejection_reason: reason });
            }
        });

        if (successCount > 0) {
            // Log per-lead so each lead's activity feed shows the import event
            for (const result of insertResults.filter(r => r.success && r.lead)) {
                await this.activityService.log({
                    user_id: userId,
                    lead_id: result.lead!.id,
                    action: LeadAction.IMPORTED,
                    action_details: { method: 'csv' }
                });
            }
        }

        return {
            imported: successCount,
            rejected: rejectedCount + trashedCount + failedInsertCount,
            trashed: trashedCount,
            errors,
            rejectedLeads
        };
    }

    /**
     * Import leads from API with source and campaign tracking
     * TICKET-046: Updated to accept source_id and campaign_id
     */
    async importLeadsFromApi(
        payloads: parsedLeadFromCSV[],
        source_id?: string,
        campaign_id?: string
    ) {
        const leads: parsedLeadFromCSV[] = payloads.map(p => ({
            name: `${p.first_name} ${p.last_name}`.trim(),
            first_name: p.first_name,
            last_name: p.last_name,
            phone: cleanPhone(p.phone || ""),
            email: (p.email || "").toLowerCase(),
            address: p.address || "",
            city: p.city || "",
            state: cleanState(p.state || ""),
            zipcode: p.zipcode || "",
            county: p.county || "",
            county_id: undefined,
            investor_id: null,
            source_id: source_id || null,
            campaign_id: campaign_id || null,
            external_lead_id: p.external_lead_id || null,
            external_ad_id: p.external_ad_id || null,
            external_ad_name: p.external_ad_name || null,
            raw_payload: p.raw_payload || null
        }));

        // Match leads to existing counties using fuzzy matching (no auto-create)
        const countyMap = await this.countyService.matchLeadsToCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];
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
                try {
                    await this.leadFormInputDAO.create({
                        lead_id: result.lead.id,
                        form_sell_fast: null,
                        form_repairs: null,
                        form_goal: null,
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

        const successCount = insertResults.filter(r => r.success).length;
        errors.push(
            ...insertResults
                .filter(r => !r.success)
                .map(r => r.error || "Unknown insert error")
        );

        // Log IMPORTED first so it has an earlier timestamp than any auto-send entries
        if (successCount > 0) {
            let sourceName: string | null = null;
            if (source_id) {
                const source = await this.sourceService.getById(source_id);
                sourceName = source?.name ?? null;
            }
            for (const result of insertResults.filter(r => r.success && r.lead)) {
                await this.activityService.log({
                    lead_id: result.lead!.id,
                    action: LeadAction.IMPORTED,
                    action_details: { method: 'api', source_name: sourceName }
                });
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
                        await this.buyerDispatchService.sendLeadToBuyer(lead, buyer, false, null);
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
            countyLogsByCountyId: Map<string, SendLog>;
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
    async sendLeadToBuyer(leadId: string, buyerId: string, userId: string, force: boolean = false) {
        // Get lead and buyer
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) {
            throw new Error(`Lead ${leadId} not found`);
        }

        const buyer = await this.buyerDAO.getById(buyerId);
        if (!buyer) {
            throw new Error(`Buyer ${buyerId} not found`);
        }

        // Delegate to BuyerDispatchService (activity logged inside dispatch)
        return await this.buyerDispatchService.sendLeadToBuyer(lead, buyer, false, userId, force);
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

        // Get outcomes (sold status) for this lead
        const outcomes = await this.leadBuyerOutcomeDAO.getByLeadId(leadId);

        // Map buyers to send history
        const history = allBuyers.map(buyer => {
            const buyerLogs = sendLogs.filter(log => log.buyer_id === buyer.id);
            const outcome = outcomes.find(o => o.buyer_id === buyer.id && o.deleted === null);
            const hasSuccessfulSend = buyerLogs.some(log =>
                log.response_code !== null && log.response_code >= 200 && log.response_code < 300
            );

            return {
                buyer_id: buyer.id,
                buyer_name: buyer.name,
                buyer_priority: buyer.priority,
                dispatch_mode: buyer.dispatch_mode,
                sold: outcome?.status === 'sold',
                has_successful_send: hasSuccessfulSend,
                sends: buyerLogs.map(log => ({
                    id: log.id,
                    status: log.status,
                    response_code: log.response_code,
                    created: log.created,
                    disputed: log.disputed,
                    dispute_reason: log.dispute_reason,
                    dispute_buyer_name: log.dispute_buyer_name,
                    disputed_at: log.disputed_at,
                })),
                total_sends: buyerLogs.length,
                last_sent_at: buyerLogs.length > 0 ? buyerLogs[0].created : null
            };
        });

        return history;
    }

    async unqueueLead(leadId: string, userId?: string | null): Promise<Lead> {
        const lead = await this.leadDAO.unqueueLead(leadId);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.UNQUEUED });
        return lead;
    }

    /**
     * Enable worker processing for a lead
     * Sets queued=true so worker can process this lead
     */
    async queueLead(leadId: string, userId?: string | null): Promise<Lead> {
        const lead = await this.leadDAO.queueLead(leadId);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.QUEUED });
        return lead;
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

        // Only allow marking as sold if there's a successful send record
        const wasSent = await this.sendLogDAO.wasSuccessfullySentToBuyer(leadId, buyerId);
        if (!wasSent) {
            throw new Error('Cannot mark as sold: no successful send record exists for this lead and buyer');
        }

        // Check if outcome already exists
        const existing = await this.leadBuyerOutcomeDAO.getByLeadAndBuyer(leadId, buyerId);
        if (existing) {
            return await this.leadBuyerOutcomeDAO.update(existing.id, {
                status: 'sold',
                sold_at: new Date(),
                sold_price: soldPrice ?? null
            });
        }

        return await this.leadBuyerOutcomeDAO.create({
            lead_id: leadId,
            buyer_id: buyerId,
            status: 'sold',
            sold_at: new Date(),
            sold_price: soldPrice ?? null
        });
    }

    async unmarkSoldToBuyer(leadId: string, buyerId: string) {
        const existing = await this.leadBuyerOutcomeDAO.getByLeadAndBuyer(leadId, buyerId);
        if (!existing) {
            throw new Error('No sold record found for this lead and buyer');
        }
        return await this.leadBuyerOutcomeDAO.trash(existing.id);
    }

    async untrashLead(leadId: string, userId?: string | null): Promise<Lead> {
        const lead = await this.leadDAO.untrashLead(leadId);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.UNTRASHED });
        return lead;
    }
}