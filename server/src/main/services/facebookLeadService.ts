// TICKET-143: Facebook Lead Ads service
// - Historical pull: fetch all past form submissions for a source
// - Webhook processing: handle real-time lead events
// - Matching: phone/email → automator lead
import { injectable } from 'tsyringe';
import axios from 'axios';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { DBContainer } from '../config/DBContainer';
import FacebookLeadRecordDAO from '../data/facebookLeadRecordDAO';
import LeadDAO from '../data/leadDAO';
import { EnvConfig } from '../config/envConfig';
import { FacebookApiLead, FacebookLeadRecord } from '../types/facebookTypes';

const FB_API = 'https://graph.facebook.com/v19.0';

const LEAD_FIELDS = 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id';

// Extracts value from field_data by common name variants
function extractField(fieldData: Array<{ name: string; values: string[] }>, ...keys: string[]): string | null {
    for (const key of keys) {
        const found = fieldData.find(f => f.name.toLowerCase().includes(key.toLowerCase()));
        if (found?.values[0]) return found.values[0].trim();
    }
    return null;
}

function normalizePhone(raw: string | null): string | null {
    if (!raw) return null;
    const d = raw.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) return d.slice(1);
    if (d.length === 10) return d;
    return d || null;
}

@injectable()
export default class FacebookLeadService {
    private readonly db: IDatabase<IClient>;

    constructor(
        db: DBContainer,
        private readonly recordDAO: FacebookLeadRecordDAO,
        private readonly leadDAO: LeadDAO,
        private readonly config: EnvConfig,
    ) {
        this.db = db.database();
    }

    // ── Historical pull ───────────────────────────────────────────────────────
    // Fetches ALL past form submissions for every fb campaign under a source.
    // Safe to run multiple times — upserts on fb_lead_id.

    async pullHistoricalLeads(sourceId: string): Promise<{ fetched: number; matched: number }> {
        const source = await this.db.oneOrNone<{ id: string; fb_page_token: string | null; name: string }>(
            `SELECT id, name, fb_page_token FROM sources WHERE id = $1 AND deleted IS NULL`,
            [sourceId]
        );

        if (!source?.fb_page_token) {
            throw new Error('Source has no Facebook page token configured');
        }

        // Get all FB campaigns for this source that have a form ID
        const campaigns = await this.db.manyOrNone<{
            id: string;
            external_form_id: string;
            external_campaign_id: string | null;
            name: string;
        }>(
            `SELECT id, external_form_id, external_campaign_id, name
             FROM campaigns
             WHERE source_id = $1 AND platform = 'fb' AND external_form_id IS NOT NULL AND deleted IS NULL`,
            [sourceId]
        );

        if (campaigns.length === 0) {
            console.log(`[FacebookLeadService] No FB campaigns with form IDs for source ${source.name}`);
            return { fetched: 0, matched: 0 };
        }

        let totalFetched = 0;
        let totalMatched = 0;

        for (const campaign of campaigns) {
            console.log(`[FacebookLeadService] Pulling form ${campaign.external_form_id} (${campaign.name})`);
            try {
                const { fetched, matched } = await this.pullForm(
                    campaign.external_form_id,
                    source.fb_page_token,
                    sourceId,
                    campaign.id
                );
                totalFetched += fetched;
                totalMatched += matched;
            } catch (err: unknown) {
                const axiosErr = err as { response?: { data?: unknown }; message?: string };
                console.error(`[FacebookLeadService] Failed form ${campaign.external_form_id}:`, axiosErr?.response?.data ?? axiosErr?.message ?? err);
            }
        }

        console.log(`[FacebookLeadService] Historical pull done — ${totalFetched} fetched, ${totalMatched} matched`);
        return { fetched: totalFetched, matched: totalMatched };
    }

    private async pullForm(
        formId: string,
        token: string,
        sourceId: string,
        campaignId: string
    ): Promise<{ fetched: number; matched: number }> {
        let fetched = 0;
        let matched = 0;
        let url: string | null = `${FB_API}/${formId}/leads?fields=${LEAD_FIELDS}&limit=100&access_token=${token}`;

        while (url) {
            const pageUrl: string = url;
            const fbRes = await axios.get<{ data: FacebookApiLead[]; paging?: { next?: string } }>(pageUrl);
            const leads = fbRes.data.data ?? [];

            for (const lead of leads) {
                const matchResult = await this.storeLead(lead, sourceId, campaignId, token);
                fetched++;
                if (matchResult === 'matched') matched++;
            }

            url = fbRes.data.paging?.next ?? null;
        }

        return { fetched, matched };
    }

    // ── Webhook processing ────────────────────────────────────────────────────
    // Called when Facebook sends a real-time lead notification.
    // Fetches the full lead via API then stores + matches.

    async processWebhookLead(leadgenId: string, pageId: string): Promise<void> {
        // Find the source with this page ID to get the token
        const source = await this.db.oneOrNone<{ id: string; fb_page_token: string | null }>(
            `SELECT id, fb_page_token FROM sources WHERE fb_page_id = $1 AND deleted IS NULL LIMIT 1`,
            [pageId]
        );

        if (!source?.fb_page_token) {
            console.warn(`[FacebookLeadService] No source/token found for page ${pageId}`);
            return;
        }

        // Fetch full lead data from Facebook
        const res = await axios.get<FacebookApiLead>(
            `${FB_API}/${leadgenId}?fields=${LEAD_FIELDS}&access_token=${source.fb_page_token}`
        );

        // Find matching campaign by form_id
        const campaign = res.data.form_id
            ? await this.db.oneOrNone<{ id: string }>(
                `SELECT id FROM campaigns WHERE external_form_id = $1 AND source_id = $2 AND deleted IS NULL LIMIT 1`,
                [res.data.form_id, source.id]
            )
            : null;

        await this.storeLead(res.data, source.id, campaign?.id ?? null, source.fb_page_token);
    }

    // ── Store + match a single lead ───────────────────────────────────────────

    private async storeLead(
        lead: FacebookApiLead,
        sourceId: string,
        campaignId: string | null,
        _token: string
    ): Promise<'matched' | 'unmatched'> {
        const phone = extractField(lead.field_data, 'phone', 'phone_number', 'mobile');
        const email = extractField(lead.field_data, 'email');
        const phoneNormalized = normalizePhone(phone);

        const record: Omit<FacebookLeadRecord, 'id' | 'synced_at'> = {
            fb_lead_id:           lead.id,
            fb_form_id:           lead.form_id ?? null,
            fb_form_name:         null,  // not returned in lead objects, fetched separately if needed
            fb_page_id:           null,
            fb_ad_id:             lead.ad_id ?? null,
            fb_ad_name:           lead.ad_name ?? null,
            fb_adset_id:          lead.adset_id ?? null,
            fb_adset_name:        lead.adset_name ?? null,
            fb_campaign_id:       lead.campaign_id ?? null,
            fb_campaign_name:     lead.campaign_name ?? null,
            phone,
            phone_normalized:     phoneNormalized,
            email,
            field_data:           lead.field_data,
            source_id:            sourceId,
            automator_campaign_id: campaignId,
            automator_lead_id:    null,
            match_status:         'pending',
            fb_created_time:      lead.created_time ? new Date(lead.created_time) : null,
        };

        await this.recordDAO.upsert(record);

        // Fetch the inserted record's id for match update
        const stored = await this.db.oneOrNone<{ id: string }>(
            `SELECT id FROM facebook_lead_records WHERE fb_lead_id = $1`,
            [lead.id]
        );
        if (!stored) return 'unmatched';

        // Match by phone then email
        const matchResult = await this.matchLead(phoneNormalized, email);

        if (matchResult.status === 'matched' && matchResult.leadId) {
            await this.recordDAO.setMatchResult(stored.id, 'matched', matchResult.leadId);
            // Backfill FB attribution onto the existing lead
            await this.db.none(
                `UPDATE leads SET
                    external_lead_id = COALESCE(external_lead_id, $[fb_lead_id]),
                    external_ad_id   = COALESCE(external_ad_id, $[ad_id]),
                    external_ad_name = COALESCE(external_ad_name, $[ad_name])
                 WHERE id = $[lead_id]`,
                {
                    lead_id: matchResult.leadId,
                    fb_lead_id: lead.id,
                    ad_id: lead.ad_id ?? null,
                    ad_name: lead.ad_name ?? null,
                }
            );
        } else {
            // No existing Automator lead — create one from the FB form data
            const newLeadId = await this.createLeadFromFb(lead, record, sourceId, campaignId);
            await this.recordDAO.setMatchResult(stored.id, 'matched', newLeadId);
        }

        return 'matched';
    }

    // Creates an Automator lead from a Facebook form submission.
    // Used when no existing lead can be matched by phone or email.
    private async createLeadFromFb(
        lead: FacebookApiLead,
        record: Omit<FacebookLeadRecord, 'id' | 'synced_at'>,
        sourceId: string,
        campaignId: string | null,
    ): Promise<string> {
        const firstName = extractField(lead.field_data, 'first_name', 'first') ?? '';
        const lastName  = extractField(lead.field_data, 'last_name', 'last') ?? '';
        // Fall back to splitting a combined "name" or "full_name" field
        let first = firstName;
        let last  = lastName;
        if (!first) {
            const fullName = extractField(lead.field_data, 'full_name', 'name') ?? '';
            const spaceIdx = fullName.indexOf(' ');
            first = spaceIdx > 0 ? fullName.slice(0, spaceIdx) : fullName;
            last  = spaceIdx > 0 ? fullName.slice(spaceIdx + 1) : '';
        }

        const created = lead.created_time ? new Date(lead.created_time) : new Date();

        const newLead = await this.db.one<{ id: string }>(
            `INSERT INTO leads (
                first_name, last_name, phone, email,
                address, city, state, zipcode,
                source_id, campaign_id,
                external_lead_id, external_ad_id, external_ad_name,
                created,
                verified
            ) VALUES (
                $[first], $[last], $[phone], $[email],
                '', '', '', '',
                $[source_id], $[campaign_id],
                $[fb_lead_id], $[ad_id], $[ad_name],
                $[created],
                false
            )
            ON CONFLICT (phone) DO UPDATE SET
                external_lead_id = COALESCE(leads.external_lead_id, EXCLUDED.external_lead_id),
                external_ad_id   = COALESCE(leads.external_ad_id,   EXCLUDED.external_ad_id),
                external_ad_name = COALESCE(leads.external_ad_name, EXCLUDED.external_ad_name)
            RETURNING id`,
            {
                first,
                last,
                phone:      record.phone,
                email:      record.email,
                source_id:  sourceId,
                campaign_id: campaignId,
                fb_lead_id: lead.id,
                ad_id:      lead.ad_id ?? null,
                ad_name:    lead.ad_name ?? null,
                created,
            }
        );

        return newLead.id;
    }

    private async matchLead(
        phone: string | null,
        email: string | null
    ): Promise<{ status: 'matched' | 'unmatched'; leadId: string | null }> {
        // Returns the best lead from candidates: active preferred, then most recent.
        // Sorted active-first by DAO so candidates[0] is always the best pick.
        const pickBest = (candidates: { id: string; deleted: string | null }[]): string | null => {
            if (candidates.length === 0) return null;
            return candidates[0].id;
        };

        if (phone) {
            const leads = await this.leadDAO.getByNormalizedPhoneAll(phone);
            const leadId = pickBest(leads);
            if (leadId) return { status: 'matched', leadId };
        }

        if (email) {
            const leads = await this.leadDAO.getByEmailAll(email);
            const leadId = pickBest(leads);
            if (leadId) return { status: 'matched', leadId };
        }

        return { status: 'unmatched', leadId: null };
    }

    // ── Re-run matching on all pending records ────────────────────────────────

    async runMatching(): Promise<{ processed: number; matched: number }> {
        const pending = await this.recordDAO.getPendingRecords();
        let matched = 0;

        for (const record of pending) {
            const result = await this.matchLead(record.phone_normalized, record.email);
            await this.recordDAO.setMatchResult(record.id, result.status, result.leadId);
            if (result.status === 'matched') matched++;
        }

        console.log(`[FacebookLeadService] Matching done — ${pending.length} processed, ${matched} matched`);
        return { processed: pending.length, matched };
    }

    // ── Webhook signature verification ───────────────────────────────────────

    verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
        if (!this.config.fbAppSecret) return false;
        const crypto = require('crypto') as typeof import('crypto');
        const expected = `sha256=${crypto.createHmac('sha256', this.config.fbAppSecret).update(rawBody).digest('hex')}`;
        try {
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        } catch {
            return false;
        }
    }
}
