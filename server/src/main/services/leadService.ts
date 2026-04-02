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
import CallOutcomeDAO from "../data/callOutcomeDAO.ts";

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
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly callOutcomeDAO: CallOutcomeDAO
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

    // TICKET-152: Merge custom fields into the lead (does not wipe existing keys)
    async updateCustomFields(leadId: string, customFields: Record<string, unknown>, userId?: string | null): Promise<Lead> {
        const updated = await this.leadDAO.updateCustomFields(leadId, customFields);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.UPDATED, action_details: { custom_fields_updated: Object.keys(customFields) } });
        return updated;
    }

    async trashLead(leadId: string, reason: LeadTrashReason = "MANUAL_USER_DELETE", userId?: string | null, userReason?: string | null): Promise<Lead> {
        try {
            const lead = await this.leadDAO.getById(leadId);
            if (!lead) {
                throw new Error("Lead not found");
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

    async getTabCounts(): Promise<{ new: number; verified: number; needs_review: number; needs_call: number }> {
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        return this.leadDAO.getTabCounts(settings.expire_after_hours);
    }

    async getMany(filters: LeadFilters): Promise<{ leads: Lead[]; count: number }> {
        try {
            let expireHours: number | undefined;
            if (filters.status === 'new') {
                const settings = await this.workerSettingsDAO.getCurrentSettings();
                expireHours = settings.expire_after_hours;
            }
            return await this.leadDAO.getMany({ ...filters, expireHours });
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
        if (!lead.verified) {
            throw new Error("Lead is not verified");
        }

        const unverified = await this.leadDAO.unverifyLead(leadId);
        await this.activityService.log({ user_id: userId, lead_id: leadId, action: LeadAction.UNVERIFIED });
        return unverified;
    }

    async importLeads(csvContent: string, userId?: string | null, sourceId?: string) {
        const { leads } = parseCsvToLeads(csvContent);

        // Use provided source, or fall back to the default CSV_IMPORT source
        let resolvedSourceId: string;
        let resolvedCampaignId: string;
        if (sourceId) {
            const campaign = await this.campaignService.getOrCreate(sourceId, 'CSV Import');
            resolvedSourceId = sourceId;
            resolvedCampaignId = campaign.id;
        } else {
            const { sourceId: sid, campaignId } = await this.ensureCsvSource();
            resolvedSourceId = sid;
            resolvedCampaignId = campaignId;
        }

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
            lead.source_id = resolvedSourceId;
            lead.campaign_id = resolvedCampaignId;

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
                // TICKET-064: Flag lead as needs_review if required fields are missing
                const missingReason = this.getMissingFieldsReason(lead);
                if (missingReason) {
                    lead.needs_review = true;
                    lead.needs_review_reason = missingReason;
                }
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
            county_id: p.county_id ?? undefined,
            investor_id: null,
            source_id: source_id || null,
            campaign_id: campaign_id || null,
            external_lead_id: p.external_lead_id || null,
            external_ad_id: p.external_ad_id || null,
            external_ad_name: p.external_ad_name || null,
            raw_payload: p.raw_payload || null,
            needs_review: p.needs_review,
            needs_review_reason: p.needs_review_reason,
        }));

        // Match leads to existing counties using fuzzy matching (no auto-create)
        const countyMap = await this.countyService.matchLeadsToCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];
        const errors: string[] = [];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);

            if (county) {
                lead.county_id = county.id;
                lead.county = county.name; // Use standardized county name
            }

            // TICKET-064: Flag lead as needs_review if required fields are missing
            // Also flag if county could not be resolved (should not be rejected)
            const missingReason = !county
                ? `Unknown county "${lead.county}, ${lead.state}" (no match found)`
                : this.getMissingFieldsReason(lead);
            if (missingReason) {
                lead.needs_review = true;
                lead.needs_review_reason = missingReason;
            }

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

    /**
     * TICKET-064: Check if a lead is missing required personal fields.
     * Returns a description string if any are missing, or null if all present.
     */
    private getMissingFieldsReason(lead: parsedLeadFromCSV): string | null {
        const required: Array<keyof parsedLeadFromCSV> = [
            'first_name', 'last_name', 'phone', 'email', 'address'
        ];
        const missing = required.filter(f => !lead[f]);
        if (missing.length === 0) return null;
        return `Missing: ${missing.join(', ')}`;
    }

    /**
     * TICKET-064: Clear the needs_review flag once missing info has been filled in.
     */
    async resolveNeedsReview(leadId: string, userId?: string | null): Promise<Lead> {
        const lead = await this.leadDAO.resolveNeedsReview(leadId);
        await this.activityService.log({
            user_id: userId ?? null,
            lead_id: leadId,
            action: LeadAction.NEEDS_REVIEW_RESOLVED
        });
        return lead;
    }

    /**
     * TICKET-155: Look up the county for a lead's current zip code and attach it.
     * Also clears needs_review if county was the only (or last) missing field.
     */
    async resolveCounty(leadId: string, userId?: string | null): Promise<Lead> {
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) throw new Error('Lead not found');

        const county = await this.countyService.getByZipCode(lead.zipcode);
        if (!county) throw new Error(`No county found for zip ${lead.zipcode}`);

        // Remove 'county' from the missing-fields reason and recalculate needs_review
        let needsReview = lead.needs_review;
        let needsReviewReason = lead.needs_review_reason ?? null;

        if (lead.needs_review_reason) {
            const missingPrefix = 'Missing: ';
            if (lead.needs_review_reason.startsWith(missingPrefix)) {
                // API intake format: "Missing: county" or "Missing: first_name, county"
                const remaining = lead.needs_review_reason
                    .slice(missingPrefix.length)
                    .split(', ')
                    .filter(field => field !== 'county');
                if (remaining.length === 0) {
                    needsReview = false;
                    needsReviewReason = null;
                } else {
                    needsReviewReason = missingPrefix + remaining.join(', ');
                }
            } else if (lead.needs_review_reason.startsWith('Unknown county')) {
                // API import format: 'Unknown county "San Bernardino, Missouri" (no match found)'
                // County was the only flagged issue — resolving it clears needs_review
                needsReview = false;
                needsReviewReason = null;
            }
        }

        const updated = await this.leadDAO.resolveCounty(leadId, county.id, county.name, county.state, needsReview, needsReviewReason);

        await this.activityService.log({
            user_id: userId ?? null,
            lead_id: leadId,
            action: LeadAction.COUNTY_RESOLVED,
            action_details: { county: county.name, zipcode: lead.zipcode }
        });

        return updated;
    }

    /**
     * TICKET-065: Flag a lead as needing a phone call.
     */
    async requestCall(leadId: string, reason: string, userId: string, note?: string | null): Promise<Lead> {
        const lead = await this.leadDAO.requestCall(leadId, reason, userId, note);
        await this.activityService.log({
            user_id: userId,
            lead_id: leadId,
            action: LeadAction.CALL_REQUESTED,
            action_details: { reason, ...(note ? { note } : {}) }
        });
        return lead;
    }

    async cancelCallRequest(leadId: string, userId: string): Promise<Lead> {
        const lead = await this.leadDAO.cancelCallRequest(leadId);
        await this.activityService.log({
            user_id: userId,
            lead_id: leadId,
            action: LeadAction.CALL_REQUEST_CANCELLED,
        });
        return lead;
    }

    /**
     * TICKET-065/123: Log a call attempt and its outcome.
     * The outcome is looked up by ID to determine resolves_call.
     * If resolves_call is true, the needs_call flag is cleared.
     */
    async executeCall(
        leadId: string,
        outcomeId: string,
        notes: string | null,
        userId: string
    ): Promise<Lead> {
        const outcomeRecord = await this.callOutcomeDAO.getById(outcomeId);
        const resolvesCall = outcomeRecord?.resolves_call ?? false;
        const outcomeLabel = outcomeRecord?.label ?? outcomeId;
        const lead = await this.leadDAO.executeCall(leadId, outcomeLabel, resolvesCall, notes, userId);
        const action = resolvesCall ? LeadAction.CALL_RESOLVED : LeadAction.CALL_EXECUTED;
        await this.activityService.log({
            user_id: userId,
            lead_id: leadId,
            action,
            action_details: { outcome: outcomeLabel, notes }
        });
        return lead;
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

        // Compute source/county filter rules and business hours status for manual send warnings
        let sourceFilter: { mode: string; buyerIds: string[] } | null = null;
        let countyFilter: { mode: string; buyerIds: string[] } | null = null;
        let outsideBusinessHours = false;
        try {
            const lead = await this.leadDAO.getById(leadId);
            if (lead?.campaign_id) {
                const campaign = await this.campaignService.getById(lead.campaign_id);
                if (campaign?.source_id) {
                    const source = await this.sourceService.getById(campaign.source_id);
                    if (source?.buyer_filter_mode && source.buyer_filter_buyer_ids?.length > 0) {
                        sourceFilter = { mode: source.buyer_filter_mode, buyerIds: source.buyer_filter_buyer_ids };
                    }
                }
            }
            let countyTimezone: string | null = null;
            if (lead?.county_id) {
                const county = await this.countyService.getById(lead.county_id);
                if (county?.buyer_filter_mode && county.buyer_filter_buyer_ids?.length > 0) {
                    countyFilter = { mode: county.buyer_filter_mode, buyerIds: county.buyer_filter_buyer_ids };
                }
                countyTimezone = county?.timezone ?? null;
            }
            // Business hours check
            const settings = await this.workerSettingsDAO.getCurrentSettings();
            const tz = countyTimezone ?? 'America/New_York';
            const local = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
            const localMinute = local.getHours() * 60 + local.getMinutes();
            if (localMinute < settings.business_hours_start || localMinute >= settings.business_hours_end) {
                outsideBusinessHours = true;
            }
        } catch {
            // non-critical — proceed without warnings
        }

        // Map buyers to send history
        const history = allBuyers.map(buyer => {
            const buyerLogs = sendLogs.filter(log => log.buyer_id === buyer.id);
            const outcome = outcomes.find(o => o.buyer_id === buyer.id && o.deleted === null);
            const hasSuccessfulSend = buyerLogs.some(log =>
                log.response_code !== null && log.response_code >= 200 && log.response_code < 300
            );

            // Compute filter warnings for manual sends
            const filter_warnings: string[] = [];
            if (sourceFilter) {
                if (sourceFilter.mode === 'include' && !sourceFilter.buyerIds.includes(buyer.id)) {
                    filter_warnings.push('Source routes leads to a restricted set of buyers — this buyer is not included');
                }
                if (sourceFilter.mode === 'exclude' && sourceFilter.buyerIds.includes(buyer.id)) {
                    filter_warnings.push('Source has blocked this buyer');
                }
            }
            if (countyFilter) {
                if (countyFilter.mode === 'include' && !countyFilter.buyerIds.includes(buyer.id)) {
                    filter_warnings.push('County routes leads to a restricted set of buyers — this buyer is not included');
                }
                if (countyFilter.mode === 'exclude' && countyFilter.buyerIds.includes(buyer.id)) {
                    filter_warnings.push('County has blocked this buyer');
                }
            }

            return {
                buyer_id: buyer.id,
                buyer_name: buyer.name,
                buyer_priority: buyer.priority,
                manual_send: buyer.manual_send,
                worker_send: buyer.worker_send,
                sold: outcome?.status === 'sold',
                has_successful_send: hasSuccessfulSend,
                filter_warnings,
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

        return { buyers: history, outside_business_hours: outsideBusinessHours };
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