// TICKET-143: Facebook Lead Ads service
import { authProvider, AxiosProvider } from '../config/axiosProvider';

export interface FacebookLeadRecord {
    id: string;
    fb_lead_id: string;
    fb_form_id: string | null;
    fb_form_name: string | null;
    fb_page_id: string | null;
    fb_ad_id: string | null;
    fb_ad_name: string | null;
    fb_adset_id: string | null;
    fb_adset_name: string | null;
    fb_campaign_id: string | null;
    fb_campaign_name: string | null;
    phone: string | null;
    phone_normalized: string | null;
    email: string | null;
    field_data: Array<{ name: string; values: string[] }>;
    source_id: string | null;
    source_name: string | null;
    automator_campaign_id: string | null;
    automator_lead_id: string | null;
    match_status: string;
    fb_created_time: string | null;
    synced_at: string;
}

export interface FacebookSyncResult {
    fetched: number;
    matched: number;
}

export interface FacebookMatchResult {
    processed: number;
    matched: number;
}

class FacebookService {
    constructor(private readonly api: AxiosProvider) {}

    async getLeads(params: {
        source_id?: string;
        match_status?: string;
        fb_form_id?: string;
        page: number;
        limit: number;
    }): Promise<{ items: FacebookLeadRecord[]; count: number }> {
        const res = await this.api.getApi().get('/api/facebook/leads', { params });
        return res.data;
    }

    async syncSource(sourceId: string): Promise<FacebookSyncResult> {
        const res = await this.api.getApi().post(`/api/facebook/sync/${sourceId}`);
        return res.data;
    }

    async runMatching(): Promise<FacebookMatchResult> {
        const res = await this.api.getApi().post('/api/facebook/match');
        return res.data;
    }
}

export default new FacebookService(authProvider);
