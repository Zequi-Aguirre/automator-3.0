import axios, {AxiosResponse} from "axios";
import {injectable} from "tsyringe";
import {EnvConfig} from "../config/envConfig";
import {ISpeedToLeadResponse} from "../types/ispeedToLeadTypes.ts";

export type ISpeedToLeadPayload = Record<string, any>;

@injectable()
export default class ISpeedToLeadIAO {
    private readonly url: string;

    constructor(private readonly config: EnvConfig) {
        if (!this.config.iSpeedToLeadWebhookUrl) {
            throw new Error("Missing iSpeedToLeadWebhookUrl in EnvConfig for ISpeedToLeadIAO");
        }

        this.url = this.config.iSpeedToLeadWebhookUrl;
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
     */
    async sendLead(payload: ISpeedToLeadPayload): Promise<AxiosResponse<ISpeedToLeadResponse>> {
        const cleanPayload = this.stripNulls(payload);

        try {
            return await axios.post(this.url, cleanPayload, {
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