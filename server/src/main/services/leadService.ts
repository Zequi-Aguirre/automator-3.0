import { injectable } from "tsyringe";
import moment from 'moment-timezone';
import LeadDAO from "../data/leadDAO";
import BuyerLeadDAO from "../data/buyerLeadDAO";
import { FlatLead, Lead, LeadDateField, LeadFilters } from "../types/leadTypes";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";
import { BuyerLead } from "../types/buyerLeadTypes.ts";
import CampaignService from "./campaignService.ts";
import { EnvConfig } from "../config/envConfig.ts";
import { PostResponse } from "../types/apiResponseTypes.ts";
import { levenshteinDistance } from "../controllers/validateLeads.ts";
import BuyerIAO from "../vendor/buyerIAO.ts";

// Interfaces
interface SendLeadResponse {
    success: boolean;
    message: string;
}

interface PingResponse {
    ping_id: string;
    result: string;
    duplicate?: boolean;
    payout?: string;
    message?: string;
    company_name: string;
}

@injectable()
export default class LeadService {
    private readonly isTestEnvironment: boolean;

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly buyerIAO: BuyerIAO,
        private readonly buyerLeadDAO: BuyerLeadDAO,
        private readonly campaignsService: CampaignService,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly config: EnvConfig
    ) {
        this.config = config;
        this.isTestEnvironment = this.config.environment === 'local' || this.config.environment === 'staging';
    }

    // Lead Management Methods
    async getLeadById(leadId: string, oldDatabase: boolean): Promise<Lead | null> {
        try {
            // Log which database we're querying in test environments
            if (this.isTestEnvironment) {
                console.log(
                    `${this.config.environment.toUpperCase()}: Fetching lead ${leadId} from ${
                        oldDatabase ? 'MongoDB' : 'PostgreSQL'
                    }`
                );
            }

            // For PostgreSQL operations, use the existing implementation
            const pgLead = await this.leadDAO.getById(leadId);

            // Log successful PostgreSQL retrievals in test environments
            if (this.isTestEnvironment && pgLead) {
                console.log('Successfully retrieved lead from PostgreSQL:', {
                    id: pgLead.id,
                    state: pgLead.state,
                    city: pgLead.city
                });
            }

            return pgLead;
        } catch (error) {
            // Provide detailed error logging while maintaining security
            console.error('Error fetching lead by ID:', {
                leadId,
                database: oldDatabase ? 'MongoDB' : 'PostgreSQL',
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw new Error(
                `Failed to fetch lead ${leadId} from ${
                    oldDatabase ? 'MongoDB' : 'PostgreSQL'
                }: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getAllLeads(oldDatabase: boolean = false): Promise<Lead[]> {
        try {
            // Log the operation in test environments
            if (this.isTestEnvironment) {
                console.log(`${this.config.environment.toUpperCase()}: Fetching all leads from ${oldDatabase ? 'MongoDB' : 'PostgreSQL'}`);
            }
            // Use the existing PostgreSQL implementation
            return await this.leadDAO.getAll();
        } catch (error) {
            console.error('Error fetching all leads:', error);
            throw new Error(`Failed to fetch all leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    findClosestCounty(counties: { state: string; name: string, normalizedName: string; id: string }[], leadState: string, normalizedLeadCounty: string): { name: string; id: string } | undefined {
        if (!leadState || !normalizedLeadCounty || !counties) { return undefined; }
        let closestCounty: { name: string; id: string } | undefined;
        let maxPercentage = 55; // Start with the lowest possible match percentage

        counties.forEach(county => {
            if (county.state.toLowerCase() === leadState.toLowerCase()) {
                const distance = levenshteinDistance(county.normalizedName, normalizedLeadCounty);
                const maxLength = Math.max(county.normalizedName.length, normalizedLeadCounty.length);
                const similarityPercentage = (1 - (distance / maxLength)) * 100;

                if (similarityPercentage > maxPercentage) {
                    maxPercentage = similarityPercentage;
                    closestCounty = { name: county.name, id: county.id };
                }
            }
        });

        return closestCounty;
    }

    async updateLead(leadId: string, leadData: Partial<Lead>): Promise<Lead> {
        return await this.leadDAO.updateLead(leadId, leadData);
    }

    // services/leadService.ts
    async trashLead(leadId: string): Promise<Lead> {
        try {
            // If using new database, proceed normally
                return await this.leadDAO.trashLead(leadId);
        } catch (error) {
            console.error('Error during lead trash process:', error);
            throw new Error(`Failed to trash lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async postLead(
        pingId: string,
        contactData: { first_name: string; last_name: string; phone: string; email: string }
    ): Promise<{ success: boolean }> {
        // Step 1: Find the BuyerLead by pingId
        const buyerLead = await this.buyerLeadDAO.getBuyerLeadByPingId(pingId);
        if (!buyerLead) {
            throw new Error(`BuyerLead not found for ping_id: ${pingId}`);
        }

        // Step 2: Find the associated Lead by lead_id from BuyerLead
        const lead = await this.leadDAO.getById(buyerLead.lead_id);
        if (!lead) {
            throw new Error(`Lead not found for lead_id: ${buyerLead.lead_id}`);
        }

        // Step 3: Update the Lead with contact information
        await this.leadDAO.updateLead(
            lead.id,
            contactData
        );

        if (buyerLead.status === "mock") {
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 3000) + 1000));
            return { success: true };
        }

        try {
            // Step 4: Post the lead to the external API
            // TODO update buyer lead record after post
            await this.buyerIAO.postLead({
                ping_id: pingId,
                address: lead.address,
                city: lead.city,
                state: lead.state,
                zipcode: lead.zipcode,
                first_name: contactData.first_name,
                last_name: contactData.last_name,
                phone: contactData.phone,
                email: contactData.email,
            });

            return { success: true };
        } catch (error) {
            console.error("Error posting lead: " + (error instanceof Error ? error.message : 'no error message'));
            throw new Error("Failed to post lead");
            // update buyer lead with error message
        }
    }

    // Lead Processing Methods
    async sendLeadWithDelay(leadId: string, userId: string): Promise<{ success: boolean; message: string }> {
        try {
                const lead = await this.leadDAO.getById(leadId);
                if (!lead) {
                    throw new Error(`Lead with ID ${leadId} not found`);
                }
                return await this.processSendLead(lead, userId);
        } catch (error) {
            console.error('Error during lead send process:', error);
            throw new Error(`Failed to send lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Helper method to process the actual send operation
    private async processSendLead(lead: Lead, userId: string): Promise<{ success: boolean; message: string }> {
        console.log(`Processing lead ID: `, lead);
        // Get active campaigns and select one randomly
        const activeCampaigns = await this.campaignsService.getActive();
        if (!activeCampaigns.length) {
            throw new Error('No active campaigns available');
        }
        const nextCampaign = activeCampaigns[Math.floor(Math.random() * activeCampaigns.length)];

        // Create initial buyer lead
        const buyerLead = await this.createInitialBuyerLead(lead.id, userId, nextCampaign.id);

        // Perform ping and handle result
        const pingResult = await this.handlePingAndUpdate(lead, buyerLead.id, nextCampaign.external_id);
        if (!pingResult.success) {
            return pingResult;
        }

        // Update worker settings with next lead timing
        const send_next_lead_at = new Date();
        const { minutes_range_start, minutes_range_end } = await this.workerSettingsDAO.getCurrentSettings();
        const randomMinutes = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        send_next_lead_at.setMinutes(send_next_lead_at.getMinutes() + randomMinutes(minutes_range_start, minutes_range_end));
        await this.workerSettingsDAO.updateSettings({ send_next_lead_at });

        // Post the lead with delay
        return await this.postLeadWithDelay(lead, pingResult.pingResponse!, buyerLead, userId);
    }

// Helper methods for status determination
    private isPingSuccessful(pingResponse: PingResponse): boolean {
        return pingResponse.result === 'success' && !pingResponse.duplicate;
    }

    private getRandomLead(leads: Lead[]): Lead | null {
        if (!leads.length) {
            return null;
        }
        return leads[Math.floor(Math.random() * leads.length)];
    }

    // Worker Lead Selection Methods
    async getLeadsToSendByWorker(): Promise<Lead[]> {
        const currentSettings = await this.workerSettingsDAO.getCurrentSettings();
        if (!currentSettings) {
            throw new Error("Worker settings not found");
        }

        const { delay_same_county: countyDelay, delay_same_state: stateDelay } = currentSettings;
        // Get all leads sent within the maximum delay window
        const maxDelay = Math.max(countyDelay!, stateDelay!);
        const flatLeadsSent = await this.leadDAO.getLeadsWithBuyerDataByTimeWindow(maxDelay, LeadDateField.PING_DATE);

        // Convert flat leads to nested leads
        const leadsSent = await Promise.all(flatLeadsSent.map(lead => this.flatToNestedLead(lead)));
        // Get blacklisted states and counties using the helper functions
        const blacklistedStates = this.getBlacklistedStates(leadsSent, stateDelay!);
        const blacklistedCounties = this.getBlacklistedCounties(leadsSent, countyDelay!, stateDelay!);

        // Convert Maps to arrays of keys (locations)
        const blacklistedStatesList = Array.from(blacklistedStates.keys());
        const blacklistedCountiesList = Array.from(blacklistedCounties.keys());

        // Get leads that aren't in blacklisted locations and haven't been sent
        console.log('Getting available leads...');
        const availableLeads = await this.leadDAO.getNotBlacklistedLeads(
            blacklistedStatesList,
            blacklistedCountiesList
        );

        // Apply timezone filtering
        const timezone = 'America/New_York';
        // get the bussines hours from the county timezone and check if in bussines hours
        const qualifiedLeads = availableLeads.filter(async lead => {
            if (await this.isWithinBusinessHours(timezone)) {
                return lead;
            }
        })

        // Select random lead from qualified leads
        const selectedLead = await this.getRandomLead(qualifiedLeads);
        return selectedLead ? [selectedLead] : [];
    }

    // Helper function to update state blacklist
    updateStateBlacklist(
        state: string,
        postDate: Date,
        stateDelay: number,
        blacklistedStates: Map<string, Date>
    ) {
        const expirationTime = new Date(postDate);
        expirationTime.setHours(expirationTime.getHours() + stateDelay);

        // Only update if new expiration is later than existing
        const existingExpiration = blacklistedStates.get(state);
        if (!existingExpiration || expirationTime > existingExpiration) {
            blacklistedStates.set(state, expirationTime);
        }
    }

    // Helper function to update county blacklist
    updateCountyBlacklist(
        countyId: string,
        pingDate: Date,
        postDate: Date | null,
        isPingAndPostSuccess: boolean,
        countyDelay: number,
        stateDelay: number,
        blacklistedCounties: Map<string, Date>
    ) {
        const basePingDate = new Date(pingDate);
        const basePostDate = postDate ? new Date(postDate) : basePingDate;

        // Set expiration based on success/failure
        const expirationTime = new Date(isPingAndPostSuccess ? basePostDate : basePingDate);
        expirationTime.setHours(expirationTime.getHours() + (isPingAndPostSuccess ? countyDelay : stateDelay));

        // Only update if new expiration is later than existing
        const existingExpiration = blacklistedCounties.get(countyId);
        if (!existingExpiration || expirationTime > existingExpiration) {
            blacklistedCounties.set(countyId, expirationTime);
        }
    }

    // Main blacklist functions using the update helpers
    getBlacklistedStates(leadsSent: Lead[], stateDelay: number) {
        const blacklistedStates = new Map<string, Date>();
        leadsSent.forEach(lead => {
            if (!lead.state || !lead.buyer_lead) return;

            const isPingAndPostSuccess = lead.buyer_lead.ping_result === 'success' &&
                lead.buyer_lead.post_result === 'success';

            if (isPingAndPostSuccess && lead.buyer_lead.post_date) {
                this.updateStateBlacklist(
                    lead.state,
                    lead.buyer_lead.post_date,
                    stateDelay,
                    blacklistedStates
                );
            }
        });

        return blacklistedStates;
    }

    async getMany(filters: LeadFilters): Promise<{ leads: Lead[]; count: number }> {
        try {
            const page = Math.max(1, filters.page || 1);
            const limit = Math.max(1, Math.min(filters.limit || 10, 100));
            // Always perform PostgreSQL operations normally
            return await this.leadDAO.getMany({ page, limit });
        } catch (error) {
            console.error('Error fetching leads:', error);
            throw new Error(`Failed to fetch leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    getBlacklistedCounties(leadsSent: Lead[], countyDelay: number, stateDelay: number) {
        const blacklistedCounties = new Map<string, Date>();

        leadsSent.forEach(lead => {
            if (!lead.county_id || !lead.buyer_lead) return;

            const isPingAndPostSuccess = lead.buyer_lead.ping_result === 'success' &&
                lead.buyer_lead.post_result === 'success';

            if (lead.buyer_lead.ping_date) {
                this.updateCountyBlacklist(
                    lead.county_id,
                    lead.buyer_lead.ping_date,
                    lead.buyer_lead.post_date,
                    isPingAndPostSuccess,
                    countyDelay,
                    stateDelay,
                    blacklistedCounties
                );
            }
        });

        return blacklistedCounties;
    }

    private async createInitialBuyerLead(leadId: string, userId: string, campaignId: string): Promise<BuyerLead> {
        return await this.buyerLeadDAO.createBuyerLead({
            lead_id: leadId,
            status: "pending",
            sent_by_user_id: userId,
            campaign_id: campaignId,
        });
    }

    private async handlePingAndUpdate(
        lead: Lead,
        buyerLeadId: string,
        campaignKey: string
    ): Promise<{ success: boolean; message: string; pingResponse?: PingResponse }> {
        const pingResponse = await this.buyerIAO.pingLead(campaignKey, {
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zipcode: lead.zipcode,
        });

        await this.updateBuyerLeadAfterPing(buyerLeadId, pingResponse);

        if (!this.isPingSuccessful(pingResponse)) {
            return {
                success: false,
                message: this.getPingFailureMessage(pingResponse)
            };
        }

        return { success: true, message: "Ping successful", pingResponse };
    }

    private getPingFailureMessage(pingResponse: PingResponse): string {
        return pingResponse.duplicate
            ? "Lead is a duplicate"
            : pingResponse.message || "Lead was rejected";
    }

    // Lead Processing Helper Methods
    private async postLeadWithDelay(
        lead: Lead,
        pingResponse: PingResponse,
        buyerLead: BuyerLead,
        userId: string
    ): Promise<SendLeadResponse> {
        try {
            // maybe move this out to a separate method
            await this.addRandomPostDelay();

            const postResponse = await this.buyerIAO.postLead({
                ping_id: pingResponse.ping_id,
                ...this.getLeadPostData(lead)
            });

            await this.updateBuyerLeadAfterPost(buyerLead.id, postResponse);
            await this.leadDAO.updateLead(lead.id, {
                vendor_lead_id: postResponse.lead_id
            });

            return {
                success: true,
                message: "Lead successfully sent"
            };
        } catch (error) {
            await this.handlePostError(buyerLead.id, error, userId);
            throw error;
        }
    }

    private getLeadPostData(lead: Lead) {
        return {
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zipcode: lead.zipcode,
            first_name: lead.first_name,
            last_name: lead.last_name,
            phone: lead.phone,
            email: lead.email,
        };
    }

    private async addRandomPostDelay(): Promise<void> {
        const currentSettings = await this.workerSettingsDAO.getCurrentSettings();
        const minDelay = (currentSettings.min_delay || 15) * 1000;
        const maxDelay = (currentSettings.max_delay || 30) * 1000;
        const delayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    private async updateBuyerLeadAfterPing(
        buyerLeadId: string,
        pingResponse: PingResponse,
    ): Promise<void> {
        const buyerLeadStatus = this.determineBuyerLeadStatus(pingResponse);
        console.log(`Buyer lead status: ${buyerLeadStatus}`);
        await this.buyerLeadDAO.updateBuyerLead(buyerLeadId, {
            ping_id: pingResponse.ping_id,
            payout: pingResponse.payout,
            status: buyerLeadStatus,
            ping_result: pingResponse.result,
            ping_message: pingResponse.message,
            company_name: pingResponse.company_name,
            error_message: null,
            ping_date: new Date(),
        });
    }

    private determineBuyerLeadStatus(pingResponse: PingResponse): string {
        return pingResponse.duplicate
            ? "duplicate"
            : pingResponse.result === "success"
                ? "accepted"
                : "rejected";
    }

    private async updateBuyerLeadAfterPost(buyerLeadId: string, postResponse: PostResponse): Promise<void> {
        await this.buyerLeadDAO.updateBuyerLead(buyerLeadId, {
            post_result: postResponse.result,
            post_message: postResponse.message,
            post_date: new Date(),
        });
    }

    private async handlePostError(
        buyerLeadId: string,
        error: unknown,
        userId: string
    ): Promise<void> {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await this.buyerLeadDAO.updateBuyerLead(buyerLeadId, {
            status: "error",
            error_message: `Error in sendLead: ${errorMessage}`,
            post_result: "failed",
            post_message: errorMessage,
            post_date: new Date(),
            sent_by_user_id: userId
        });
    }

    private async isWithinBusinessHours(timezone: string): Promise<boolean> {
        const currentSettings = await this.workerSettingsDAO.getCurrentSettings();
        const localTime = moment().tz(timezone);

        // Create moment objects for start and end times
        const startTime = moment(currentSettings!.business_hours_start, 'HH:mm').tz(timezone);
        const endTime = moment(currentSettings!.business_hours_end, 'HH:mm').tz(timezone);

        // Set the dates to today to compare just the times
        startTime.year(localTime.year()).month(localTime.month()).date(localTime.date());
        endTime.year(localTime.year()).month(localTime.month()).date(localTime.date());

        return localTime.isBetween(startTime, endTime, 'minute', '[)');
    }

    private async flatToNestedLead(flatLead: FlatLead): Promise<Lead> {
        const buyerLead: BuyerLead | null = flatLead['buyer_lead.id']
            ? {
                id: flatLead['buyer_lead.id'],
                buyer_id: flatLead['buyer_lead.buyer_id'],
                campaign_id: flatLead['buyer_lead.campaign_id'],
                company_name: flatLead['buyer_lead.company_name'],
                error_message: flatLead['buyer_lead.error_message'],
                lead_id: flatLead.id,
                payout: flatLead['buyer_lead.payout'],
                ping_date: flatLead['buyer_lead.ping_date'] ? flatLead['buyer_lead.ping_date'] : null,
                ping_id: flatLead['buyer_lead.ping_id'],
                ping_message: flatLead['buyer_lead.ping_message'],
                ping_result: flatLead['buyer_lead.ping_result'],
                post_date: flatLead['buyer_lead.post_date'] ? flatLead['buyer_lead.post_date'] : null,
                post_message: flatLead['buyer_lead.post_message'],
                post_result: flatLead['buyer_lead.post_result'],
                sent_by_user_id: flatLead['buyer_lead.sent_by_user_id'],
                status: flatLead['buyer_lead.status']
            } as BuyerLead
            : null;

        return {
            id: flatLead.id,
            address: flatLead.address,
            city: flatLead.city,
            state: flatLead.state,
            county: flatLead.county ?? '',
            county_id: flatLead.county_id,
            zipcode: flatLead.zipcode,
            first_name: flatLead.first_name,
            last_name: flatLead.last_name,
            phone: flatLead.phone,
            email: flatLead.email,
            is_test: flatLead.is_test,
            created: flatLead.created.toISOString(),
            buyer_lead: buyerLead,
            vendor_lead_id: flatLead.vendor_lead_id ?? ''
        };

    }
}