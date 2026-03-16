#!/usr/bin/env node
/**
 * Export production data to local JSON files for migration.
 *
 * Usage:
 *   npm run export-prod-data
 *   (or: doppler run -c prd --scope automator -- node scripts/exportProdData.js)
 *
 * Output: prod-export/ directory with counties.json, leads.json, send_log.json, meta.json
 * NOTE:   prod-export/ is gitignored — it contains PII.
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
    const client = buildClient();
    const outputDir = path.join(__dirname, '..', 'prod-export');

    console.log(`Connecting to ${process.env.DB_HOST}/${process.env.DB_DB}...`);
    await client.connect();
    console.log('Connected.\n');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // ── 1. Counties ──────────────────────────────────────────────────────────
    console.log('Exporting counties...');
    const { rows: counties } = await client.query(`
        SELECT id, name, state, population, timezone, blacklisted, whitelisted, created, modified, deleted
        FROM counties
        ORDER BY state, name
    `);
    writeJSON(outputDir, 'counties.json', counties);
    console.log(`  ✓ ${counties.length} counties\n`);

    // ── 2. Active leads only (deleted IS NULL) ───────────────────────────────
    console.log('Exporting active leads...');
    const { rows: leads } = await client.query(`
        SELECT
            id, address, city, state, zipcode, county, county_id,
            first_name, last_name, phone, email,
            created, modified, deleted,
            verified, sent, sent_date,
            deleted_reason, private_notes, worker_enabled, source_id
        FROM leads
        WHERE deleted IS NULL
        ORDER BY created ASC
    `);
    writeJSON(outputDir, 'leads.json', leads);
    console.log(`  ✓ ${leads.length} active leads\n`);

    // ── 3. Send log for those leads ──────────────────────────────────────────
    console.log('Exporting send_log...');
    const leadIds = leads.map(l => l.id);
    const { rows: sendLog } = await client.query(`
        SELECT
            id, lead_id, buyer_id, affiliate_id, campaign_id,
            status, response_code, response_body, payout_cents,
            created, modified, deleted
        FROM send_log
        WHERE lead_id = ANY($1::uuid[])
          AND deleted IS NULL
        ORDER BY created ASC
    `, [leadIds]);
    writeJSON(outputDir, 'send_log.json', sendLog);
    console.log(`  ✓ ${sendLog.length} send_log entries\n`);

    // ── 4. Lead form inputs ───────────────────────────────────────────────────
    console.log('Exporting lead_form_inputs...');
    const { rows: formInputs } = await client.query(`
        SELECT
            id, lead_id,
            form_unit, form_multifamily, form_square, form_year, form_garage,
            form_bedrooms, form_bathrooms, form_repairs, form_occupied,
            form_sell_fast, form_goal, form_goal2, form_call_time,
            form_owner, form_owned_years, form_listed, form_scenario,
            form_source, activeprospect_certificate_url,
            last_post_status, last_post_payload, last_post_at,
            created, modified, deleted
        FROM lead_form_inputs
        WHERE lead_id = ANY($1::uuid[])
          AND deleted IS NULL
        ORDER BY created ASC
    `, [leadIds]);
    writeJSON(outputDir, 'form_inputs.json', formInputs);
    console.log(`  ✓ ${formInputs.length} form input records\n`);

    // ── 5. Meta ──────────────────────────────────────────────────────────────
    const { rows: buyerRows } = await client.query(
        `SELECT id FROM buyers WHERE name = 'iSpeedToLead' LIMIT 1`
    );
    const meta = {
        old_ispeed_buyer_id: buyerRows[0]?.id ?? null,
        exported_at: new Date().toISOString(),
        lead_count: leads.length,
        send_log_count: sendLog.length,
        county_count: counties.length,
        form_input_count: formInputs.length,
    };
    writeJSON(outputDir, 'meta.json', meta);

    await client.end();

    console.log('Export complete!');
    console.log(`Files written to: prod-export/`);
    console.log(JSON.stringify(meta, null, 2));
}

main().catch(err => {
    console.error('\nExport failed:', err.message);
    process.exit(1);
});
