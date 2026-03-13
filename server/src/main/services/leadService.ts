import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { ApiLeadPayload, Lead, LeadFilters, parsedLeadFromCSV } from "../types/leadTypes";
import { parseCsvToLeads, splitName, cleanPhone } from "../middleware/parseCsvToLeads.ts";
import CountyService from "../services/countyService.ts";
import LeadFormInputDAO from "../data/leadFormInputDAO.ts";
import ISpeedToLeadIAO from "../vendor/iSpeedToLeadIAO.ts";
import SendLogDAO from "../data/sendLogDAO.ts";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";
import { County } from "../types/countyTypes.ts";

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
        private readonly iSpeedToLeadIAO: ISpeedToLeadIAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO
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

        const log = await this.sendLogDAO.createLog({
            lead_id: lead.id,
            affiliate_id: null,
            campaign_id: null,
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
        const { leads } = parseCsvToLeads(csvContent);

        const countyMap = await this.countyService.loadOrCreateCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];

        for (const lead of leads) {
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);

            // County is required
            if (!county) {
                continue;
            }

            lead.county_id = county.id;

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

        // SETTINGS
        const settings = await this.workerSettingsDAO.getCurrentSettings();
        const delaySameCountyMs = settings.delay_same_county * 60 * 60 * 1000;

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
        const errors: string[] = [];
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
            countiesById: Map<string, County>;
            countyLogsByCountyId: Map<string, any>;
            delaySameCountyMs: number;
        }
    ): LeadTrashReason | null {

        const countyId = lead.county_id;

        // County is required
        if (!countyId) {
            return null;
        }

        const county = deps.countiesById.get(countyId);

        // 1. Blacklist (absolute rule)
        if (county && county.blacklisted) {
            return "BLACKLISTED_COUNTY";
        }

        // 2. County cooldown (unless whitelisted)
        const countyIsWhitelisted = !!(county && county.whitelisted);
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
}