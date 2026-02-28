import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { ApiLeadPayload, Lead, LeadFilters, parsedLeadFromCSV } from "../types/leadTypes";
import { parseCsvToLeads, splitName, cleanPhone } from "../middleware/parseCsvToLeads.ts";
import CountyService from "../services/countyService.ts";
import InvestorService from "../services/investorService.ts";
import LeadFormInputDAO from "../data/leadFormInputDAO.ts";
import ISpeedToLeadIAO from "../vendor/iSpeedToLeadIAO.ts";
import SendLogDAO from "../data/sendLogDAO.ts";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";
import { County } from "../types/countyTypes.ts";
import { Investor } from "../types/investorTypes.ts";
import BuyerDAO from "../data/buyerDAO.ts";
import BuyerDispatchService from "./buyerDispatchService.ts";
import LeadBuyerOutcomeDAO from "../data/leadBuyerOutcomeDAO.ts";

type LeadTrashReason =
    | "BLACKLISTED_COUNTY"
    | "BLACKLISTED_INVESTOR"
    | "COUNTY_COOLDOWN"
    | "INVESTOR_COOLDOWN"
    | "EXPIRED_18_HOURS"
    | "MANUAL_USER_DELETE";

@injectable()
export default class LeadService {

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadFormInputDAO: LeadFormInputDAO,
        private readonly countyService: CountyService,
        private readonly investorService: InvestorService,
        private readonly iSpeedToLeadIAO: ISpeedToLeadIAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly buyerDAO: BuyerDAO,
        private readonly buyerDispatchService: BuyerDispatchService,
        private readonly leadBuyerOutcomeDAO: LeadBuyerOutcomeDAO
    ) {}

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

    async sendLead(leadId: string): Promise<Lead> {
        const lead = await this.leadDAO.getById(leadId);
        if (!lead) {
            throw new Error("Lead not found");
        }
        if (lead.sent) {
            throw new Error("Lead already sent");
        }
        if (!lead.verified) {
            throw new Error("Lead must be verified first");
        }

        const form = await this.leadFormInputDAO.getByLeadId(lead.id);
        if (!form) {
            throw new Error("Lead missing form data");
        }

        const investor = lead.investor_id
            ? await this.investorService.getById(lead.investor_id)
            : null;
        const county = await this.countyService.getById(lead.county_id);

        if (!county) {
            throw new Error("County not found for lead");
        }

        const payload: any = {
            form_first_name: lead.first_name,
            form_last_name: lead.last_name,
            form_phone: lead.phone,
            form_email: lead.email,
            form_address: lead.address,
            form_city: lead.city,
            form_state: lead.state,
            form_zip: lead.zipcode,
            ...form
        };

        delete payload.created;
        delete payload.modified;
        delete payload.deleted;
        delete payload.lead_id;
        delete payload.id;

        // Get iSpeedToLead buyer (all sends in old system go to iSpeedToLead)
        const buyers = await this.buyerDAO.getByPriority();
        const ispeedBuyer = buyers.find(b => b.name === 'iSpeedToLead');
        if (!ispeedBuyer) {
            throw new Error('iSpeedToLead buyer not found - please run backfill migration');
        }

        const log = await this.sendLogDAO.createLog({
            lead_id: lead.id,
            buyer_id: ispeedBuyer.id,
            affiliate_id: null,
            campaign_id: null,
            investor_id: investor?.id || null,
            status: "sent"
        });

        try {
            const axiosResponse = await this.iSpeedToLeadIAO.sendLead(payload);
            const response = axiosResponse.data;

            const payoutCents = (() => {
                const payout = response?.payout;
                if (!payout) {
                    return null;
                }
                const num = Number(payout);
                return Number.isFinite(num) ? Math.round(num * 100) : null;
            })();

            await this.sendLogDAO.updateLog(log.id, {
                response_code: axiosResponse.status,
                response_body: JSON.stringify(response),
                payout_cents: payoutCents,
                status: "sent"
            });

            const updatedLead = await this.leadDAO.markLeadAsSent(lead.id);

            // One-time whitelist consumption
            if (investor && investor.whitelisted) {
                await this.investorService.updateInvestorMeta(investor.id, {
                    whitelisted: false
                });
            }

            if (county.whitelisted) {
                await this.countyService.updateCountyMeta(county.id, {
                    whitelisted: false
                });
            }

            return updatedLead;

        } catch (err: any) {
            await this.leadDAO.markLeadAsSent(lead.id);
            const errorResponse = err.response?.data || err.message || "Unknown error";

            await this.sendLogDAO.updateLog(log.id, {
                response_code: err.response?.status ?? 0,
                response_body: JSON.stringify(errorResponse),
                payout_cents: null,
                status: "failed"
            });

            throw new Error(
                typeof errorResponse === "string" ? errorResponse : JSON.stringify(errorResponse)
            );
        }
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
        const { leads, investors } = parseCsvToLeads(csvContent);

        // Load / create ref data (only investors and counties now)
        const investorMap = investors.size > 0
            ? await this.investorService.loadOrCreateInvestors(investors)
            : new Map<string, Investor>();
        const countyMap = await this.countyService.loadOrCreateCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];

        for (const lead of leads) {
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);

            // Investor is optional - only look up if provided
            const investor = lead.investor_id
                ? investorMap.get(lead.investor_id.toLowerCase())
                : null;

            // County is required
            if (!county) {
                continue;
            }

            // If investor was specified but not found, skip
            if (lead.investor_id && !investor) {
                continue;
            }

            lead.county_id = county.id;
            lead.investor_id = investor?.id || null;

            resolvedLeads.push(lead);
        }

        if (resolvedLeads.length === 0) {
            return {
                imported: 0,
                rejected: 0,
                trashed: 0,
                errors: ["No valid leads to import after resolving references"]
            };
        }

        // Build maps by ID for filtering logic
        const countiesById = new Map<string, County>();
        countyMap.forEach((c: County) => {
            countiesById.set(c.id, c);
        });

        const investorsById = new Map<string, Investor>();
        investorMap.forEach((i: Investor) => {
            investorsById.set(i.id, i);
        });

        // SETTINGS
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const delaySameInvestorMs = settings.delay_same_investor * 60 * 60 * 1000;
        const delaySameCountyMs = settings.delay_same_county * 60 * 60 * 1000;

        // LOGS FOR COOLDOWNS
        const investorIds = [...new Set(
            resolvedLeads
                .filter(l => l.investor_id)
                .map(l => l.investor_id!)
        )];
        const countyIds = [...new Set(resolvedLeads.map(l => l.county_id!))];

        const recentInvestorLogs = await this.sendLogDAO.getLatestLogsByInvestorIds(investorIds);
        const recentCountyLogs = await this.sendLogDAO.getLatestLogsByCountyIds(countyIds);

        const investorLogsByInvestorId = new Map<string, any>();
        for (const log of recentInvestorLogs) {
            if (log.investor_id) {
                investorLogsByInvestorId.set(log.investor_id, log);
            }
        }

        const countyLogsByCountyId = new Map<string, any>();
        for (const log of recentCountyLogs) {
            if (log.county_id) {
                countyLogsByCountyId.set(log.county_id, log);
            }
        }

        const survivors: parsedLeadFromCSV[] = [];
        const errors: string[] = [];
        let trashedCount = 0;

        for (const lead of resolvedLeads) {
            const reason = this.getTrashReasonForImport(
                lead,
                {
                    investorsById,
                    countiesById,
                    investorLogsByInvestorId,
                    countyLogsByCountyId,
                    delaySameInvestorMs,
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
            rejected: trashedCount + failedInsertCount,
            trashed: trashedCount,
            errors
        };
    }

    async importLeadsFromApi(payloads: ApiLeadPayload[]) {
        const leads: parsedLeadFromCSV[] = payloads.map(p => {
            const { first_name, last_name } = splitName(p.name || "");
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
                state: (p.state || "").toUpperCase(),
                zipcode: p.zip_code || "",
                county: p.county || "",
                county_id: undefined,
                private_notes: p.private_note || null,
                investor_id: null,
            };
        });

        const countyMap = await this.countyService.loadOrCreateCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];
        const resolvedPayloads: ApiLeadPayload[] = [];
        const errors: string[] = [];

        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);

            if (!county) {
                errors.push(`Could not resolve county "${lead.county}" in state "${lead.state}"`);
                continue;
            }

            lead.county_id = county.id;
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
        lead: parsedLeadFromCSV,
        deps: {
            investorsById: Map<string, Investor>;
            countiesById: Map<string, County>;
            investorLogsByInvestorId: Map<string, any>;
            countyLogsByCountyId: Map<string, any>;
            delaySameInvestorMs: number;
            delaySameCountyMs: number;
        }
    ): LeadTrashReason | null {

        const investorId = lead.investor_id;
        const countyId = lead.county_id;

        // County is required
        if (!countyId) {
            return null;
        }

        const county = deps.countiesById.get(countyId);
        const investor = investorId ? deps.investorsById.get(investorId) : undefined;

        // 1. Blacklists (absolute rules)
        if (county && county.blacklisted) {
            return "BLACKLISTED_COUNTY";
        }

        if (investor && investor.blacklisted) {
            return "BLACKLISTED_INVESTOR";
        }

        // 2. Whitelists: only affect cooldowns
        const investorIsWhitelisted = !!(investor && investor.whitelisted);
        const countyIsWhitelisted = !!(county && county.whitelisted);

        // 3. Investor cooldown (only if investor exists and not whitelisted)
        if (investorId && !investorIsWhitelisted) {
            const investorLog = deps.investorLogsByInvestorId.get(investorId);

            if (investorLog && deps.delaySameInvestorMs > 0) {
                const last = new Date(investorLog.created).getTime();

                if (Date.now() - last <= deps.delaySameInvestorMs) {
                    return "INVESTOR_COOLDOWN";
                }
            }
        }

        // 4. County cooldown (unless whitelisted)
        if (!countyIsWhitelisted) {
            const countyLog = deps.countyLogsByCountyId.get(countyId);

            if (countyLog && deps.delaySameCountyMs > 0) {
                const last = new Date(countyLog.created).getTime();

                if (Date.now() - last <= deps.delaySameCountyMs) {
                    return "COUNTY_COOLDOWN";
                }
            }
        }

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