#!/usr/bin/env node
/**
 * Export staging source/campaign data for production lead enrichment.
 *
 * Usage:
 *   npm run export-staging-data
 *   (requires prod-export/leads.json from a prior export-prod-data run)
 *
 * What this does:
 *   - Reads prod-export/leads.json to build a phone → production UUID map
 *   - Connects to staging DB via Doppler stg config
 *   - Finds staging leads that share a phone number with a production lead
 *   - Exports ONLY the sources and campaigns linked to those matched leads
 *   - Exports lead_mappings.json keyed by PRODUCTION lead UUID (not staging UUID)
 *
 * Output: staging-export/ directory (gitignored)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function buildClient() {
    const host = process.env.DB_HOST;
    const isRender = host && host.startsWith('dpg-');
    return new Client({
        host: isRender ? `${host}.oregon-postgres.render.com` : host,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_DB,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        ssl: isRender ? { rejectUnauthorized: false } : false,
    });
}

function writeJSON(dir, filename, data) {
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

async function main() {
    const prodExportDir  = path.join(__dirname, '..', 'prod-export');
    const outputDir      = path.join(__dirname, '..', 'staging-export');

    // Load production lead UUIDs to cross-reference
    const leadsFile = path.join(prodExportDir, 'leads.json');
    if (!fs.existsSync(leadsFile)) {
        throw new Error('prod-export/leads.json not found. Run "npm run export-prod-data" first.');
    }
    const prodLeads = JSON.parse(fs.readFileSync(leadsFile, 'utf8'));

    // Build normalized-phone → production lead UUID map.
    // Normalize to digits-only so formats like "(555) 123-4567" and "5551234567" match.
    const normalizePhone = p => p.replace(/\D/g, '');
    const phoneToProdId = new Map();
    for (const l of prodLeads) {
        if (l.phone) {
            const normalized = normalizePhone(l.phone);
            if (normalized) phoneToProdId.set(normalized, l.id);
        }
    }
    const prodPhones = [...phoneToProdId.keys()];
    console.log(`Loaded ${prodLeads.length} production leads (${prodPhones.length} with phone numbers) to cross-reference.\n`);

    const client = buildClient();
    console.log(`Connecting to staging: ${process.env.DB_HOST}/${process.env.DB_DB}...`);
    await client.connect();
    console.log('Connected.\n');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // ── 0. Counties (zip_codes enrichment) ───────────────────────────────────
    // Export all staging counties that have zip_codes populated.
    // The import script will match by name+state and copy zip_codes onto prod counties.
    console.log('Exporting counties with zip_codes...');
    const { rows: stagingCounties } = await client.query(`
        SELECT name, state, zip_codes
        FROM counties
        WHERE zip_codes IS NOT NULL AND array_length(zip_codes, 1) > 0
    `);
    writeJSON(outputDir, 'counties.json', stagingCounties);
    console.log(`  ✓ ${stagingCounties.length} counties with zip_codes\n`);

    // ── 1. Lead → source/campaign mappings (matched by phone number) ─────────
    // Query staging by phone; map results back to production UUIDs.
    console.log('Exporting lead → source/campaign mappings (matching by phone)...');
    // Normalize phone in DB using regexp_replace to strip non-digits, then match
    const { rows: stagingMatches } = await client.query(`
        SELECT regexp_replace(phone, '[^0-9]', '', 'g') AS phone_normalized,
               source_id, campaign_id
        FROM leads
        WHERE regexp_replace(phone, '[^0-9]', '', 'g') = ANY($1::text[])
          AND (source_id IS NOT NULL OR campaign_id IS NOT NULL)
    `, [prodPhones]);

    // Translate staging rows to production lead UUIDs using normalized phone
    const leadMappings = stagingMatches
        .map(m => ({
            lead_id:     phoneToProdId.get(m.phone_normalized),  // production UUID
            source_id:   m.source_id,
            campaign_id: m.campaign_id,
        }))
        .filter(m => m.lead_id);  // safety: skip any phone that didn't resolve

    writeJSON(outputDir, 'lead_mappings.json', leadMappings);
    console.log(`  ✓ ${stagingMatches.length} staging matches → ${leadMappings.length} leads mapped to production UUIDs\n`);

    // Collect referenced source and campaign IDs
    const campaignIds = [...new Set(leadMappings.map(m => m.campaign_id).filter(Boolean))];
    const sourceIds   = [...new Set(leadMappings.map(m => m.source_id).filter(Boolean))];

    // ── 2. Campaigns ─────────────────────────────────────────────────────────
    console.log('Exporting campaigns...');
    const { rows: campaigns } = await client.query(`
        SELECT id, source_id, name, created, modified, deleted
        FROM campaigns
        WHERE id = ANY($1::uuid[])
    `, [campaignIds]);
    // Merge in any campaigns referenced via source_id on leads that don't have campaign_id
    writeJSON(outputDir, 'campaigns.json', campaigns);
    console.log(`  ✓ ${campaigns.length} campaigns\n`);

    // Collect all source IDs (from lead mappings + campaign source_ids)
    const campaignSourceIds = campaigns.map(c => c.source_id).filter(Boolean);
    const allSourceIds = [...new Set([...sourceIds, ...campaignSourceIds])];

    // ── 3. Sources ────────────────────────────────────────────────────────────
    console.log('Exporting sources...');
    const { rows: sources } = await client.query(`
        SELECT id, name, created, modified, deleted
        FROM sources
        WHERE id = ANY($1::uuid[])
    `, [allSourceIds]);
    // Note: token, email, lead_manager_id intentionally excluded —
    // staging schema may not have email/lead_manager_id; tokens differ from production
    writeJSON(outputDir, 'sources.json', sources);
    console.log(`  ✓ ${sources.length} sources\n`);

    const meta = {
        exported_at: new Date().toISOString(),
        staging_host: process.env.DB_HOST,
        prod_leads_cross_referenced: prodLeads.length,
        leads_matched_by_phone: leadMappings.length,
        counties_with_zip_codes: stagingCounties.length,
        sources_count: sources.length,
        campaigns_count: campaigns.length,
    };
    writeJSON(outputDir, 'meta.json', meta);

    await client.end();
    console.log('Staging export complete!');
    console.log(`Files written to: staging-export/`);
    console.log(JSON.stringify(meta, null, 2));
}

main().catch(err => {
    console.error('\nExport failed:', err.message);
    process.exit(1);
});
