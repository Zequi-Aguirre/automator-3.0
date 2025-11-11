import { injectable } from "tsyringe";
import moment from 'moment-timezone';
import LeadDAO from "../data/leadDAO";
import { FlatLead, Lead, LeadFilters } from "../types/leadTypes";
import WorkerSettingsDAO from "../data/workerSettingsDAO.ts";
import { BuyerLead } from "../types/buyerLeadTypes.ts";
import { EnvConfig } from "../config/envConfig.ts";
import { levenshteinDistance, parsedLeadFromCSV } from "../controllers/validateLeads.ts";
import { CountiesSingletonFactory } from "../data/countiesSingleton.ts";

type LeadFromCSV = {
    Name: string;
    'Phone Number': string;
    'Email Address': string;
    Address: string;
    City: string;
    State: string;
    'Zip Code': string;
    County: string;
    'Private Notes': string;
    'Buyer Notes'?: string;
    Category?: string;
};

@injectable()
export default class LeadService {
    private readonly isTestEnvironment: boolean;

    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO,
        private readonly countiesSingletonFactory: CountiesSingletonFactory,
        private readonly config: EnvConfig
    ) {
        this.config = config;
        this.isTestEnvironment = this.config.environment === 'local' || this.config.environment === 'staging';
    }

    // Lead Management Methods
    async getLeadById(leadId: string): Promise<Lead | null> {
        try {
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
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            throw new Error(
                `Failed to fetch lead ${leadId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async insertManyLeads(
        csvLeads: string[],
        adminId: string,
    ): Promise<{
        status: number;
        data: {
            invalidLeads: parsedLeadFromCSV[],
            postedLeads: Lead[],
            duplicatedLeads: Partial<Lead>[],
            failedParsingLeads: string[]
        }
    }> {

        // Get category configuration
        const csvLeadsWithoutDoubleQuotes = csvLeads.map(e => {
            return e.replace(/"/g, '')
        })

        const parseAndTransformCSV = (dataString: string): { leads: parsedLeadFromCSV[], failedParsingLeads: string[] } => {
            let leadsArray = dataString.split('\n')
            leadsArray = leadsArray.filter(line => line.trim() !== ''); // this removes empty lines with filter
            const keys = leadsArray[0].split(',').map((key) => key.trim());
            const leads: parsedLeadFromCSV[] = [];
            const failedParsingLeads: string[] = [];

            for (let i = 1; i <= leadsArray.length -1; i++) {
                try {
                    const leadValues = leadsArray[i].split(',');
                    const leadObject: Partial<LeadFromCSV> = {};
                    keys?.forEach((key, index) => {
                        leadObject[key as keyof LeadFromCSV] = leadValues[index].trim();
                    });

                    const transformedLead: parsedLeadFromCSV = {
                        name: leadObject.Name ?? '',
                        phone: leadObject['Phone Number'] ?? '',
                        email: leadObject['Email Address'] ?? '',
                        address: leadObject.Address ?? '',
                        city: leadObject.City ?? '',
                        state: leadObject.State ?? '',
                        zip_code: leadObject['Zip Code'] ?? '',
                        county: leadObject.County ?? '',
                    };

                    leads.push(transformedLead);
                } catch (e) {
                    console.warn('Lead parsing failed', { error: e,lead: leadsArray[i] });
                    failedParsingLeads.push(leadsArray[i]);
                }
            }

            return { leads, failedParsingLeads };
        }

        const leads = parseAndTransformCSV(csvLeadsWithoutDoubleQuotes[0]);
        const { invalidLeads, validLeads } = this.validateLeads(leads.leads);
        const postedLeads: Lead[] = [];
        const duplicatedLeads: Partial<Lead>[] = [];
        const results = await this.leadDAO.createLeads(validLeads);

        results.forEach(result => {
            if (result.success) {
                postedLeads.push(result.lead!);
            } else {
                const failedLead = result.failedLead!;

                console.warn(`lead failed to be created: ${result.error}`, { lead: failedLead });
                if ((result.error?.toLowerCase()?.includes('duplicate lead')) === true) {
                    duplicatedLeads.push(failedLead);
                } else {
                    invalidLeads.push(failedLead)
                }
            }
        });

        return {
            status: 200,
            data: {
                invalidLeads,
                postedLeads,
                duplicatedLeads,
                failedParsingLeads: leads.failedParsingLeads
            }
        };
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

    private getRandomLead(leads: Lead[]): Lead | null {
        if (!leads.length) {
            return null;
        }
        return leads[Math.floor(Math.random() * leads.length)];
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

    // Worker Lead Selection Methods
    async getLeadsToSendByWorker(): Promise<Lead[]> {
        const currentSettings = await this.workerSettingsDAO.getCurrentSettings();
        if (!currentSettings) {
            throw new Error("Worker settings not found");
        }

        const { delay_same_county: countyDelay, delay_same_state: stateDelay } = currentSettings;
        // Get all leads sent within the maximum delay window
        const maxDelay = Math.max(countyDelay!, stateDelay!);
        const flatLeadsSent = await this.leadDAO.getLeadsWithBuyerDataByTimeWindow(maxDelay);

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

    isLeadEmpty = (lead: parsedLeadFromCSV): boolean => {
        if (lead.name.trim() !== "") return false;
        if (lead.phone.trim() !== "") return false;
        if (lead.email.trim() !== "") return false;
        if (lead.address.trim() !== "") return false;
        if (lead.city.trim() !== "") return false;
        if (lead.state.trim() !== "") return false;
        if (lead.zip_code.trim() !== "") return false;
        return lead.county.trim() === "";
    };

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

    private validateLeads(leads: parsedLeadFromCSV[]): { validLeads: parsedLeadFromCSV[], invalidLeads: parsedLeadFromCSV[] } {
        const validLeads: parsedLeadFromCSV[] = [];
        const invalidLeads: parsedLeadFromCSV[] = [];

        // Function to check if a lead is valid
        function isValidLead(lead: parsedLeadFromCSV): boolean {
            // Validation rules: Example rules (modify as needed)
            const isValidName = lead.name.trim() !== '';
            const isValidPhone = lead.phone.trim() !== '';
            const isValidEmail = lead.email.trim() !== '' && lead.email.includes('@');
            const isValidAddress = lead.address.trim() !== '';
            const hasZipCode = lead.zip_code.trim() !== '';

            // Add more validation rules as required

            // attach reasons for invalid leads
            if (!isValidName) {
                lead.reason = 'Invalid name';
            }
            if (!isValidPhone) {
                lead.reason = lead.reason !== undefined ? lead.reason + ', phone ' : 'Invalid phone';
            }
            if (!isValidEmail) {
                lead.reason = lead.reason !== undefined ? lead.reason + ', email ' : 'Invalid email';
            }
            if (!isValidAddress) {
                lead.reason = lead.reason !== undefined ? lead.reason + ', address ' : 'Invalid address';
            }
            if (!hasZipCode) {
                lead.reason = lead.reason !== undefined ? lead.reason + ', zip_code ' : 'Invalid zip_code';
            }

            return isValidName && isValidPhone && isValidEmail && isValidAddress && hasZipCode; // Add more conditions based on your validation criteria
        }

        // Iterate through each lead
        leads.forEach(lead => {
            // Check if lead is empty
            if (this.isLeadEmpty(lead)) {
                return;
            }
            if (isValidLead(lead)) {
                validLeads.push(lead);
            } else {
                invalidLeads.push(lead);
            }
        });

        return {
            validLeads,
            invalidLeads
        };
    }
}