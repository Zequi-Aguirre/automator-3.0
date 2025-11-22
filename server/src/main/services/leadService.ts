import { injectable } from "tsyringe";
import LeadDAO from "../data/leadDAO";
import { Lead, LeadFilters } from "../types/leadTypes";
import { parseCsvToLeads } from "../middleware/parseCsvToLeads.ts";
import { parsedLeadFromCSV } from "../controllers/validateLeads.ts";
import CountyService from "../services/countyService.ts";
import CampaignService from "../services/campaignService.ts";
import AffiliateService from "../services/affiliateService.ts";
import InvestorService from "../services/investorService.ts";
import LeadFormInputDAO from "../data/leadFormInputDAO.ts";
import ISpeedToLeadIAO from "../vendor/iSpeedToLeadIAO.ts";
import SendLogDAO from "../data/sendLogDAO.ts";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";
import { Affiliate } from "../types/affiliateTypes.ts";
import { Campaign } from "../types/campaignTypes.ts";
import { County } from "../types/countyTypes.ts";
import { Investor } from "../types/investorTypes.ts";

type LeadTrashReason =
    | "BLACKLISTED_AFFILIATE"
    | "BLACKLISTED_CAMPAIGN"
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
        private readonly campaignService: CampaignService,
        private readonly affiliateService: AffiliateService,
        private readonly investorService: InvestorService,
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

        const campaign = await this.campaignService.getById(lead.campaign_id);
        if (!campaign) {
            throw new Error("Campaign not found for lead");
        }

        const affiliate = await this.affiliateService.getById(campaign.affiliate_id);
        const investor = await this.investorService.getById(lead.investor_id);
        const county = await this.countyService.getById(lead.county_id);

        if (!affiliate || !investor || !county) {
            throw new Error("Affiliate, investor, or county not found for lead");
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

        const log = await this.sendLogDAO.createLog({
            lead_id: lead.id,
            affiliate_id: affiliate.id,
            campaign_id: campaign.id,
            investor_id: investor.id,
            status: "sent"
        });

        try {
            const axiosResponse = await this.iSpeedToLeadIAO.sendLead(payload);
            const response = axiosResponse.data;

            const payoutCents = (() => {
                const payout = response.data?.payout;
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

            const updatedLead = await this.leadDAO.updateLead(lead.id, { sent: true });

            // One-time whitelist consumption
            if (investor.whitelisted) {
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

            await this.leadDAO.updateLead(lead.id, { sent: true });
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
            "form_listed"
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
        const { leads, affiliates, campaigns, investors } = parseCsvToLeads(csvContent);

        // Load / create ref data
        const investorMap = await this.investorService.loadOrCreateInvestors(investors);
        const affiliateMap = await this.affiliateService.loadOrCreateAffiliates(affiliates);
        const campaignMap = await this.campaignService.loadOrCreateCampaigns(campaigns, affiliateMap);
        const countyMap = await this.countyService.loadOrCreateCounties(leads);

        const resolvedLeads: parsedLeadFromCSV[] = [];

        for (const lead of leads) {
            const countyKey = `${lead.county.toLowerCase()}_${lead.state.toLowerCase()}`;
            const county = countyMap.get(countyKey);
            const investor = investorMap.get(lead.investor_id?.toLowerCase() || "");
            const campaign = campaignMap.get(lead.campaign_id?.toLowerCase() || "");

            if (!county || !investor || !campaign) {
                continue;
            }

            lead.county_id = county.id;
            lead.investor_id = investor.id;
            lead.campaign_id = campaign.id;

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
        const affiliatesById = new Map<string, Affiliate>();
        affiliateMap.forEach((a: Affiliate) => {
            affiliatesById.set(a.id, a);
        });

        const campaignsById = new Map<string, Campaign>();
        campaignMap.forEach((c: Campaign) => {
            campaignsById.set(c.id, c);
        });

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
        const delaySameInvestorMs = settings.delay_same_investor * 24 * 60 * 60 * 1000;
        const delaySameCountyMs = settings.delay_same_county * 60 * 60 * 1000;

        // LOGS FOR COOLDOWNS
        const investorIds = [...new Set(resolvedLeads.map(l => l.investor_id!))];
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
                    campaignsById,
                    affiliatesById,
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

    private getTrashReasonForImport(
        lead: parsedLeadFromCSV,
        deps: {
            investorsById: Map<string, Investor>;
            campaignsById: Map<string, Campaign>;
            affiliatesById: Map<string, Affiliate>;
            countiesById: Map<string, County>;
            investorLogsByInvestorId: Map<string, any>;
            countyLogsByCountyId: Map<string, any>;
            delaySameInvestorMs: number;
            delaySameCountyMs: number;
        }
    ): LeadTrashReason | null {

        const campaignId = lead.campaign_id;
        const investorId = lead.investor_id;
        const countyId = lead.county_id;

        if (!campaignId || !investorId || !countyId) {
            return null;
        }

        const campaign = deps.campaignsById.get(campaignId);
        const county = deps.countiesById.get(countyId);
        const investor = deps.investorsById.get(investorId);
        const affiliate = campaign ? deps.affiliatesById.get(campaign.affiliate_id) : undefined;

        // 1. Blacklists (absolute rules)
        if (affiliate && affiliate.blacklisted) {
            return "BLACKLISTED_AFFILIATE";
        }

        if (campaign && campaign.blacklisted) {
            return "BLACKLISTED_CAMPAIGN";
        }

        if (county && county.blacklisted) {
            return "BLACKLISTED_COUNTY";
        }

        if (investor && investor.blacklisted) {
            return "BLACKLISTED_INVESTOR";
        }

        // 2. Whitelists: only affect cooldowns
        const investorIsWhitelisted = !!(investor && investor.whitelisted);
        const countyIsWhitelisted = !!(county && county.whitelisted);

        // 3. Investor cooldown (unless whitelisted)
        if (!investorIsWhitelisted) {
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
}