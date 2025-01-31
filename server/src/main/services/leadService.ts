import { injectable } from "tsyringe";
import moment from 'moment-timezone';
import { v4 as uuidv4 } from "uuid";
import LeadDAO from "../data/leadDAO";
import BuyerIAO from "../vendor/buyerIAO.ts";
import BuyerDAO from "../data/buyerDAO";
import BuyerLeadDAO from "../data/buyerLeadDAO";
import { FlatLead, Lead, LeadDateField, LeadFilters } from "../types/leadTypes";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";
import { BuyerLead } from "../types/buyerLeadTypes.ts";
import CampaignService from "./campaignService.ts";
import { EnvConfig } from "../config/envConfig.ts";
import { PostResponse } from "../types/apiResponseTypes.ts";
import MongoDAO from "../data/mongoDAO.ts";
import { CountiesSingletonFactory } from "../data/countiesSingleton.ts";
import { levenshteinDistance } from "../controllers/validateLeads.ts";
import { Buyer } from "../types/buyerTypes.ts";

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
        private readonly buyerDAO: BuyerDAO,
        private readonly buyerLeadDAO: BuyerLeadDAO,
        private readonly campaignsService: CampaignService,
        private readonly countiesSingletonFactory: CountiesSingletonFactory,
        private readonly mongoDAO: MongoDAO,
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

            // For MongoDB operations
            if (oldDatabase) {
                // MongoDB requires a specific ID format - we'll handle this safely
                let mongoLead = null;
                try {
                    mongoLead = await this.mongoDAO.getLeadById(leadId);
                } catch (mongoError) {
                    // Log the specific MongoDB error in test environments
                    if (this.isTestEnvironment) {
                        console.error('MongoDB fetch attempt failed:', mongoError);
                    }
                    return null;
                }

                // If we found a lead in MongoDB, check if it's active
                if (mongoLead) {
                    if (this.isTestEnvironment) {
                        console.log('Successfully retrieved lead from MongoDB:', {
                            id: mongoLead.id,
                            state: mongoLead.state,
                            city: mongoLead.city
                        });
                    }
                    return mongoLead;
                }
                return null;
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

            // Route the request based on database selection
            if (oldDatabase) {
                // When using MongoDB, make sure we only get active leads
                const { leads } = await this.mongoDAO.getMany({
                    page: 1, // Get first page
                    limit: 1000 // Set a reasonable limit for bulk fetching
                });

                // MongoDB fetching is already filtered for non-trashed,
                // non-sent leads in the DAO layer
                return leads;
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

    async migrateLead(mongoLeadId: string): Promise<Lead> {
        try {
            if (this.isTestEnvironment) {
                console.log(`${this.config.environment.toUpperCase()}: Starting lead migration process for ID: ${mongoLeadId}`);
            }

            // Get the lead from MongoDB
            const mongoLead = await this.mongoDAO.getLeadById(mongoLeadId);
            if (!mongoLead) {
                throw new Error('Lead not found in MongoDB');
            }

            const attachLeadsToCountyId = async (leads: Lead[]): Promise<Partial<Lead>[]> => {
                const singleton = await this.countiesSingletonFactory.singleton();
                const counties = singleton.getAllCountiesOrderedByState();
                const linkedLeads: Partial<Lead>[] = [];

                leads.forEach(lead => {
                    const normalizedLeadCounty = this.countiesSingletonFactory.normalizeCountyName(lead.county)
                    const stateCounties = counties[lead.state.toUpperCase()];
                    if (!stateCounties) return []
                    const closestCounty = this.findClosestCounty(stateCounties, lead.state, normalizedLeadCounty);
                    console.log('Lead:', lead.county);
                    console.log('Closest county:', closestCounty);

                    if (closestCounty) {
                        lead.county = closestCounty.name;
                        linkedLeads.push({ ...lead, county_id: closestCounty.id, county: closestCounty.name });
                    } else {
                        console.log('County not found:', lead.county);
                        console.log('// TODO trash in mongo')
                    }
                });

                return linkedLeads as Partial<Lead>[];
            };

            console.log('Mongo lead:', mongoLead);
            const leadWithCounty = await attachLeadsToCountyId([mongoLead]) as Lead[];
            console.log('Lead with county:', leadWithCounty);
            console.log('// TODO this has to be handled better')

            // Create in new database
            const newLead = await this.leadDAO.createLead({
                ...leadWithCounty[0],
                is_test: this.isTestEnvironment
            });

            // Mark as migrated in MongoDB based on environment
            if (this.isTestEnvironment) {
                if (this.config.environment === 'local') {
                    console.log('MOCK: Would mark MongoDB lead as migrated:', {
                        oldId: mongoLeadId,
                        newId: newLead.id
                    });
                } else {
                    console.log('TEST: Simulating MongoDB lead migration');
                }
            } else {
                await this.mongoDAO.markLeadAsSent(mongoLeadId, `Migrated to PostgreSQL ID: ${newLead.id}`);
            }

            return newLead;
        } catch (error) {
            console.error('Error during lead migration:', error);
            throw new Error(`Failed to migrate lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async updateLead(leadId: string, leadData: Partial<Lead>): Promise<Lead> {
        return await this.leadDAO.updateLead(leadId, leadData);
    }

    // services/leadService.ts
    async trashLead(leadId: string, oldDatabase: boolean = false): Promise<Lead> {
        try {
            // If using new database, proceed normally
            if (!oldDatabase) {
                return await this.leadDAO.trashLead(leadId);
            }

            // For old database, first get the lead
            const mongoLead = await this.mongoDAO.getLeadById(leadId);
            if (!mongoLead) {
                throw new Error('Lead not found in MongoDB');
            }

            // Import to new database
            const newLead = await this.migrateLead(mongoLead.id);

            // Handle MongoDB operations based on environment
            if (this.isTestEnvironment) {
                if (this.config.environment === 'local') {
                    console.log('MOCK: Would delete lead from MongoDB:', leadId);
                    console.log('MOCK: MongoDB lead data:', mongoLead);
                } else {
                    // Staging environment
                    console.log('TEST: Would mark lead as trash in MongoDB:', leadId);
                }
            } else {
                // Production - actually perform MongoDB operation
                console.log('PRODUCTION: Marking lead as trash in MongoDB:', leadId);
                await this.mongoDAO.markLeadAsTrash(leadId);
            }

            // Always perform PostgreSQL operation since it's our new system
            return await this.leadDAO.trashLead(newLead.id);
        } catch (error) {
            console.error('Error during lead trash process:', error);
            throw new Error(`Failed to trash lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async pingLead(campaignKey: string, leadData: {
        address: string;
        city: string;
        state: string;
        zipcode: string;
    }): Promise<{ ping_id: string; company_name: string }> {
        console.log("Pinging lead with data:", leadData);
        // TODO add address validation
        console.log('// TODO: Add address validation. hardcoded county id used.');
        const county_id = '123e4567-e89a-12d3-b456-226600001106'
        // Step 1: Create the lead in the database
        const lead = await this.leadDAO.createBasicLead({
            ...leadData,
            county_id,
            is_test: this.isTestEnvironment,
        });

        const campaignFromDB = await this.campaignsService.getByExternalId(campaignKey);

        // Step 2: Pre-create the BuyerLead record with default values
        const initialBuyerLead = await this.buyerLeadDAO.createBuyerLead({
            lead_id: lead.id,
            status: "pending",
            campaign_id: campaignFromDB.id,
        });

        try {
            // Step 3: Ping NTSMHF API
            const pingResponse = await this.buyerIAO.pingLead(campaignKey, {
                address: lead.address,
                city: lead.city,
                state: lead.state,
                zipcode: lead.zipcode,
            });

            // Update BuyerLead record based on ping response
            const buyerLeadStatus = pingResponse.duplicate ? "duplicate" : pingResponse.result === "success" ? "accepted" : "rejected";

            await this.buyerLeadDAO.updateBuyerLead(initialBuyerLead.id, {
                ping_id: pingResponse.ping_id,
                payout: pingResponse.payout || null,
                status: buyerLeadStatus,
                ping_result: pingResponse.result,
                ping_message: pingResponse.message,
                company_name: pingResponse.company_name,
                error_message: null,
            });

            if (pingResponse.result === "success" && !pingResponse.duplicate) {
                // Lead is accepted, return ping_id and buyer
                return {
                    ping_id: pingResponse.ping_id,
                    company_name: pingResponse.company_name,
                };
            }

            // Handle duplicate or rejected leads
            console.log(
                pingResponse.duplicate
                    ? "Duplicate lead detected, fetching mock buyer..."
                    : "Lead rejected, fetching mock buyer..."
            );

            // TODO get this buyers from the DB
            return await this.handleMockResponse(lead);

        } catch (error: unknown) {
            console.error("Error pinging NTSMHF:", error);
            const error_message = `Error pinging NTSMHF: ${error instanceof Error ? error.message : 'no error message'}`;

            // Update BuyerLead with error details
            await this.buyerLeadDAO.updateBuyerLead(initialBuyerLead.id, {
                status: "error",
                ping_result: "failed",
                error_message,
            });

            // Fallback to mock API on error
            // TODO get this buyers from the DB
            return await this.handleMockResponse(lead);
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
    async sendLeadWithDelay(leadId: string, userId: string, oldDatabase: boolean = false): Promise<{ success: boolean; message: string }> {
        try {
            if (!oldDatabase) {
                const lead = await this.leadDAO.getById(leadId);
                if (!lead) {
                    throw new Error('Lead not found in PostgreSQL');
                }
                return await this.processSendLead(lead, userId);
            }

            // Handle MongoDB lead
            const mongoLead = await this.mongoDAO.getLeadById(leadId);
            if (!mongoLead) {
                throw new Error('Lead not found in MongoDB');
            }

            // Import to new database
            const importedLead = await this.migrateLead(mongoLead.id);

            // Handle MongoDB operations based on environment
            if (this.isTestEnvironment) {
                if (this.config.environment === 'local') {
                    console.log('MOCK: Would mark lead as sent in MongoDB:', leadId);
                    console.log('MOCK: MongoDB lead data:', mongoLead);
                } else {
                    // Staging environment
                    console.log('TEST: Would mark lead as sent in MongoDB:', leadId);
                }
            } else {
                // Production - actually perform MongoDB operation
                console.log('PRODUCTION: Marking lead as sent in MongoDB:', leadId);
                await this.mongoDAO.markLeadAsSent(leadId, 'Migrated and sent through new system');
            }

            return await this.processSendLead(importedLead, userId);
        } catch (error) {
            console.error('Error during lead send process:', error);
            throw new Error(`Failed to send lead: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Helper method to process the actual send operation
    private async processSendLead(lead: Lead, userId: string): Promise<{ success: boolean; message: string }> {
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

            // MongoDB operations are read-only, so we don't need to mock them
            if (filters.oldDatabase) {
                const mongoResult = await this.mongoDAO.getMany({ page, limit });

                // Log the operation for monitoring
                if (this.isTestEnvironment) {
                    console.log(`${this.config.environment.toUpperCase()}: Reading from MongoDB - Page: ${page}, Limit: ${limit}`);
                }

                return mongoResult;
            }

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

    // Mock Response Handling
    private async handleMockResponse(lead: Lead): Promise<{ ping_id: string; company_name: string }> {
        // TODO get this buyers from the DB
        console.log("Handling mock response for lead:", lead);
        const mockBuyer = await this.getRandomMockBuyer();
        console.log("Selected mock buyer:", mockBuyer);
        const pingId = uuidv4();

        await this.createMockBuyerLead(lead, mockBuyer, pingId);

        return {
            ping_id: pingId,
            company_name: mockBuyer.name,
        };
    }

    private async getRandomMockBuyer(): Promise<Buyer> {
        const allMockedBuyers = await this.buyerDAO.getAllMocked();
        if (!allMockedBuyers.length) {
            throw new Error("No mock buyers found, please contact support");
        }

        return allMockedBuyers[Math.floor(Math.random() * allMockedBuyers.length)];
    }

    private async createMockBuyerLead(lead: Lead, mockBuyer: Buyer, pingId: string): Promise<void> {
        // TODO rename this functionality to to use alternative buyers wording not mock.
        await this.buyerLeadDAO.createBuyerLead({
            lead_id: lead.id,
            buyer_id: mockBuyer.id,
            ping_id: pingId,
            payout: '0',
            status: "mock",
            ping_result: "success",
            ping_message: "Mock data used",
            company_name: mockBuyer.name,
            ping_date: new Date(),
            campaign_id: '123e4567-e89b-12d3-b456-226600000401',
        });
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