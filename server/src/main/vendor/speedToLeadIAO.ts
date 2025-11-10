import "reflect-metadata";
import axios from "axios";
import { EnvConfig } from "../config/envConfig.ts";
import { injectable } from "tsyringe";
import { PingResponse, PostResponse } from "../types/apiResponseTypes.ts";

@injectable()
export default class BuyerIAO {
    private readonly apiBaseUrl: string
    private readonly isTestingMode: boolean;
    constructor(private readonly config: EnvConfig) {
        this.config = config;
        this.apiBaseUrl = this.config.buyerUrl;
        this.isTestingMode = this.config.environment === 'local' || this.config.environment === 'staging';
    }

    returnRandomPingResponse(leadData: {
        address: string;
        city: string;
        state: string;
        zipcode: string } ): PingResponse {
        const responses = [
            {
                result: "success",
                message: "Lead successfully pinged",
                company_name: "Test Buyer LLC",
                ping_id: "ping_" + Date.now().toString(),
                state: leadData.state,
                county: "Sample County",
                payout: "25.00",
                duplicate: false
            },
            {
                result: "success duplicated",
                message: "Ping Lead Duplicate",
                company_name: "Duplicated Test Buyer LLC",
                ping_id: "ping_duplicate_" + Date.now().toString(),
                state: leadData.state,
                county: "Sample County duplicated",
                duplicate: true,
                payout: null // No payout for duplicate leads
            },
            {
                result: "error",
                message: "Ping Lead Error",
                company_name: "Error Test Buyer LLC",
                ping_id: "ping_error_" + Date.now().toString(),
                state: leadData.state,
                county: "Sample County error",
                payout: null // No payout for error leads
            }
        ];

        // Randomly select a response
        const randomIndex = Math.floor(Math.random() * responses.length);
        return responses[randomIndex] as PingResponse;
    }

    async pingLead(campaignKey: string, leadData: {
        address: string;
        city: string;
        state: string;
        zipcode: string;
    }): Promise<PingResponse> {
        if (this.isTestingMode) {
            if (this.config.environment === 'local') {
                console.log("Mocked Ping Response")
                return this.returnRandomPingResponse(leadData);
            }
            console.log("TEST lead sent");
        } else {
            console.log("REAL lead sent");
        }

        console.log('// TODO: Handle inactive campaign');
        console.log(`
            if (apiResponse.data.reason === "Affiliate or Campaign inactive") {
                // find the campaign and set it to inactive
                campaign.active = false;
                await campaign.save();
                
            }
        `)

        console.log('// TODO: Handle duplicate lead');
        const payload = {
            campaign_key: campaignKey,
            ...leadData,
            ...(this.isTestingMode ? {} : { test: "true" }),
        };

        const response = await axios.post(`${this.apiBaseUrl}/ping`, payload);
        return response.data;
    }

    async postLead(leadData: {
        ping_id: string;
        first_name: string;
        last_name: string;
        phone: string;
        email: string;
        address: string;
        city: string;
        state: string;
        zipcode: string;
    }): Promise<PostResponse> {
        if (this.isTestingMode) {
            if (this.config.environment === 'local') {
                console.log("Mocked Post Response")
                return {
                    result: "success",
                    lead_id: "lead_" + Date.now().toString(),
                    county: "Sample County",
                    buyer: "Test Buyer LLC",
                    state: leadData.state,
                    message: "Lead successfully posted",
                    reason: "N/A",
                    payout: "50.00"
                };
            }
            console.log("TEST lead sent");
        } else {
            console.log("REAL lead sent");
        }

        const payload = {
            campaign_key: this.config.campaignKey,
            ...leadData,
            ...(this.isTestingMode ? {} : { test: "true" }),
        };

        const response = await axios.post(`${this.apiBaseUrl}/post`, payload);
        return response.data;
    }
}