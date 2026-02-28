import axios, {AxiosResponse} from "axios";
import {injectable} from "tsyringe";
import {ISpeedToLeadResponse} from "../types/ispeedToLeadTypes.ts";

export type ISpeedToLeadPayload = Record<string, any>;

@injectable()
export default class ISpeedToLeadIAO {
    constructor() {
        // No constructor dependencies - webhook URL comes from buyers table
    }

    private stripNulls(obj: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => {
                if (v === null || v === undefined) return false;
                if (typeof v === "string" && v.trim() === "") return false;
                return true;
            })
        );
    }

    /**
     * Sends lead to ISpeedToLead webhook.
     * Returns raw Axios response, because downstream code logs it anyway.
     * @param webhookUrl - The webhook URL from the buyer's configuration
     * @param payload - The lead data to send
     */
    async sendLead(webhookUrl: string, payload: ISpeedToLeadPayload): Promise<AxiosResponse<ISpeedToLeadResponse>> {
        if (!webhookUrl) {
            throw new Error("Webhook URL is required for ISpeedToLeadIAO.sendLead");
        }

        const cleanPayload = this.stripNulls(payload);

        try {
            return await axios.post(webhookUrl, cleanPayload, {
                timeout: 15000,
                headers: {
                    "Content-Type": "application/json"
                }
            })
        } catch (err: any) {
            // Bubble up error with original axios details preserved
            if (err.response) {
                throw new Error(
                    `ISpeedToLead request failed [${err.response.status}]: ${JSON.stringify(err.response.data)}`
                );
            }

            throw new Error(`ISpeedToLead request failed: ${err.message || "Unknown error"}`);
        }
    }
}