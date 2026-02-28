import axios, { AxiosResponse } from 'axios';
import { BuyerAuthConfig } from '../types/buyerTypes';

export type BuyerWebhookResponse = {
    success: boolean;
    statusCode: number;
    responseBody: any;
    error?: string;
};

export default class BuyerWebhookAdapter {
    private readonly timeout = 15000; // 15 seconds

    /**
     * Send lead data to buyer's webhook with flexible authentication
     *
     * @param url - Buyer's webhook URL
     * @param payload - Lead data to send
     * @param authConfig - Authentication configuration (header name, prefix, token)
     * @returns Response with status code and body
     */
    async sendToBuyer(
        url: string,
        payload: Record<string, any>,
        authConfig: BuyerAuthConfig
    ): Promise<BuyerWebhookResponse> {
        try {
            // Strip null/undefined values from payload
            const cleanPayload = this.stripNullValues(payload);

            // Build headers with flexible auth
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            // Add auth header if token is provided
            if (authConfig.auth_token_decrypted) {
                const headerName = authConfig.auth_header_name || 'Authorization';
                const headerValue = authConfig.auth_header_prefix
                    ? `${authConfig.auth_header_prefix}${authConfig.auth_token_decrypted}`
                    : authConfig.auth_token_decrypted;

                headers[headerName] = headerValue;
            }

            // Make POST request with timeout
            const response: AxiosResponse = await axios.post(url, cleanPayload, {
                headers,
                timeout: this.timeout,
                validateStatus: () => true // Don't throw on any status code
            });

            // Determine success (2xx status codes)
            const success = response.status >= 200 && response.status < 300;

            return {
                success,
                statusCode: response.status,
                responseBody: response.data
            };

        } catch (error: any) {
            // Handle timeout, network errors, etc.
            const isTimeout = error.code === 'ECONNABORTED';
            const errorMessage = isTimeout
                ? 'Request timeout (15s)'
                : error.message || 'Unknown error';

            return {
                success: false,
                statusCode: 0, // 0 indicates network/timeout error
                responseBody: null,
                error: errorMessage
            };
        }
    }

    /**
     * Recursively strip null and undefined values from payload
     */
    private stripNullValues(obj: Record<string, any>): Record<string, any> {
        const result: Record<string, any> = {};

        for (const [key, value] of Object.entries(obj)) {
            // Skip null and undefined
            if (value === null || value === undefined) {
                continue;
            }

            // Recursively clean nested objects
            if (typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.stripNullValues(value);
            } else {
                result[key] = value;
            }
        }

        return result;
    }
}
