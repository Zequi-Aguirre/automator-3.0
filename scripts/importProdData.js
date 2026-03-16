#!/usr/bin/env node
/**
 * Import exported production data into a target database.
 *
 * Usage:
 *   npm run import-prod-data-dev     # → local dev (Docker)
 *   npm run import-prod-data-stg     # → staging
 *   npm run import-prod-data-prd     # → new production
 *   (add --dry-run to preview without writing)
 *
 * Prerequisites:
 *   1. Run `npm run export-prod-data` first to populate prod-export/
 *   2. Run `npm run dev-db-reset` (or equivalent) on the target DB so all migrations are applied
 *
 * What this script does:
 *   1. Inserts counties          (same UUIDs — leads.county_id stays valid)
 *   2. Inserts active leads      (worker_enabled → queued, private_notes stripped, campaign_id = NULL)
 *   3. Inserts send_log          (buyer_id mapped to new iSpeedToLead UUID, send_source = 'worker')
 *   4. Creates lead_buyer_outcomes for successful sends (response_code 200)
 *   5. Creates activity_log entries:
 *        - lead_imported  (private_notes → notes field, timestamped at lead.created)
 *        - lead_verified  (for pre-verified leads, attributed to System user)
 *        - lead_sent      (one per send_log entry, attributed to System user)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Fixed UUID for the System/Worker service account (must match seed.sql)
const SYSTEM_USER_ID = '123e4567-e89b-12d3-b456-226600000104';

const DRY_RUN = process.argv.includes('--dry-run');

// ── DB connection ────────────────────────────────────────────────────────────

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

// ── File helpers ─────────────────────────────────────────────────────────────

function readJSON(filename) {
    const filePath = path.join(__dirname, '..', 'prod-export', filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Export file not found: ${filePath}\nRun "npm run export-prod-data" first.`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const client = buildClient();

    console.log(`Target DB: ${process.env.DB_HOST}/${process.env.DB_DB}`);
    if (DRY_RUN) console.log('⚠️  DRY RUN — no changes will be written\n');

    await client.connect();
    console.log('Connected.\n');

    // Load export files
    const counties = readJSON('counties.json');
    const leads    = readJSON('leads.json');
    const sendLog  = readJSON('send_log.json');
    const meta     = readJSON('meta.json');

    console.log(`Loaded from prod-export:`);
    console.log(`  ${counties.length} counties`);
    console.log(`  ${leads.length} leads`);
    console.log(`  ${sendLog.length} send_log entries`);
    console.log(`  Exported at: ${meta.exported_at}\n`);

    // Verify preconditions in target DB
    const { rows: buyerRows } = await client.query(
        `SELECT id, allow_resell FROM buyers WHERE name = 'iSpeedToLead' AND deleted IS NULL LIMIT 1`
    );
    if (!buyerRows.length) {
        throw new Error('iSpeedToLead buyer not found. Make sure all migrations ran on target DB.');
    }
    const newIspeedBuyerId = buyerRows[0].id;
    const ispeedAllowResell = buyerRows[0].allow_resell;

    const { rows: sysUserRows } = await client.query(
        `SELECT id FROM users WHERE id = $1`, [SYSTEM_USER_ID]
    );
    if (!sysUserRows.length) {
        throw new Error(`System user (${SYSTEM_USER_ID}) not found. Make sure seed ran on target DB.`);
    }

    console.log(`iSpeedToLead buyer UUID in target: ${newIspeedBuyerId}`);
    console.log(`System user UUID:                  ${SYSTEM_USER_ID}\n`);

    if (DRY_RUN) {
        console.log('Dry run complete. No changes written.');
        await client.end();
        return;
    }

    await client.query('BEGIN');

    try {
        const counts = { counties: 0, leads: 0, sendLog: 0, outcomes: 0, activities: 0 };

        // ── Step 1: Counties ─────────────────────────────────────────────────
        console.log('Step 1: Inserting counties...');
        for (const c of counties) {
            await client.query(`
                INSERT INTO counties (id, name, state, population, timezone, blacklisted, whitelisted, created, modified, deleted)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO NOTHING
            `, [c.id, c.name, c.state, c.population, c.timezone, c.blacklisted, c.whitelisted,
                c.created, c.modified, c.deleted]);
            counts.counties++;
        }
        console.log(`  ✓ ${counts.counties} counties\n`);

        // ── Step 2: Leads ────────────────────────────────────────────────────
        // Mappings:
        //   worker_enabled → queued
        //   campaign_id    → NULL  (campaigns not migrated)
        //   private_notes  → NOT stored (goes to activity_log instead)
        //   new columns    → safe defaults (needs_review=false, needs_call=false, etc.)
        console.log('Step 2: Inserting leads...');
        for (const l of leads) {
            await client.query(`
                INSERT INTO leads (
                    id, address, city, state, zipcode, county, county_id,
                    first_name, last_name, phone, email,
                    created, modified, deleted,
                    verified, sent, sent_date,
                    campaign_id, source_id, deleted_reason,
                    queued, needs_review, needs_call
                ) VALUES (
                    $1,  $2,  $3,  $4,  $5,  $6,  $7,
                    $8,  $9,  $10, $11,
                    $12, $13, $14,
                    $15, $16, $17,
                    NULL, $18, $19,
                    $20, false, false
                )
                ON CONFLICT (id) DO NOTHING
            `, [
                l.id, l.address, l.city, l.state, l.zipcode, l.county, l.county_id,
                l.first_name, l.last_name, l.phone, l.email,
                l.created, l.modified, l.deleted,
                l.verified, l.sent, l.sent_date,
                l.source_id, l.deleted_reason,
                l.worker_enabled,   // → queued
            ]);
            counts.leads++;
        }
        console.log(`  ✓ ${counts.leads} leads\n`);

        // ── Step 3: Send log ─────────────────────────────────────────────────
        // All sends go to iSpeedToLead (old buyer_id or NULL → new iSpeedToLead UUID)
        // send_source = 'worker' for all historical records
        console.log('Step 3: Inserting send_log...');
        for (const s of sendLog) {
            await client.query(`
                INSERT INTO send_log (
                    id, lead_id, buyer_id, source_id, campaign_id,
                    status, response_code, response_body, payout_cents,
                    created, modified, deleted,
                    send_source, disputed
                ) VALUES (
                    $1, $2, $3, NULL, NULL,
                    $4, $5, $6, $7,
                    $8, $9, $10,
                    'worker', false
                )
                ON CONFLICT (id) DO NOTHING
            `, [
                s.id, s.lead_id, newIspeedBuyerId,
                s.status, s.response_code, s.response_body, s.payout_cents,
                s.created, s.modified, s.deleted,
            ]);
            counts.sendLog++;
        }
        console.log(`  ✓ ${counts.sendLog} send_log entries\n`);

        // ── Step 4: lead_buyer_outcomes ──────────────────────────────────────
        // One outcome per lead (first successful send to iSpeedToLead)
        console.log('Step 4: Creating lead_buyer_outcomes...');
        const seenLeads = new Set();
        for (const s of sendLog) {
            if (s.status !== 'sent' || s.response_code !== 200) continue;
            if (seenLeads.has(s.lead_id)) continue;
            seenLeads.add(s.lead_id);

            await client.query(`
                INSERT INTO lead_buyer_outcomes (lead_id, buyer_id, status, sold_at, allow_resell, created, modified)
                SELECT $1, $2, 'sold', $3, $4, $3, $3
                WHERE NOT EXISTS (
                    SELECT 1 FROM lead_buyer_outcomes
                    WHERE lead_id = $1 AND buyer_id = $2 AND deleted IS NULL
                )
            `, [s.lead_id, newIspeedBuyerId, s.created, ispeedAllowResell]);
            counts.outcomes++;
        }
        console.log(`  ✓ ${counts.outcomes} lead_buyer_outcomes\n`);

        // ── Step 5: Activity log ─────────────────────────────────────────────
        console.log('Step 5: Creating activity_log entries...');

        // 5a. private_notes → lead_imported activity (timestamped at lead creation)
        for (const l of leads) {
            if (!l.private_notes || !l.private_notes.trim()) continue;
            await client.query(`
                INSERT INTO activity_log (lead_id, entity_type, entity_id, action, action_details, created)
                SELECT $1, 'lead', $1, 'lead_imported', $2::jsonb, $3
                WHERE NOT EXISTS (
                    SELECT 1 FROM activity_log
                    WHERE lead_id = $1 AND action = 'lead_imported'
                      AND action_details->>'source' = 'migration'
                )
            `, [
                l.id,
                JSON.stringify({ notes: l.private_notes.trim(), source: 'migration' }),
                l.created,
            ]);
            counts.activities++;
        }

        // 5b. verified leads → lead_verified (attributed to System user)
        for (const l of leads) {
            if (!l.verified) continue;
            await client.query(`
                INSERT INTO activity_log (user_id, lead_id, entity_type, entity_id, action, action_details, created)
                SELECT $1, $2, 'lead', $2, 'lead_verified', $3::jsonb, $4
                WHERE NOT EXISTS (
                    SELECT 1 FROM activity_log
                    WHERE lead_id = $2 AND action = 'lead_verified'
                      AND action_details->>'source' = 'migration'
                )
            `, [
                SYSTEM_USER_ID,
                l.id,
                JSON.stringify({ source: 'migration', note: 'Verified prior to system migration' }),
                l.modified,
            ]);
            counts.activities++;
        }

        // 5c. sends → lead_sent (one per send_log entry, attributed to System user)
        for (const s of sendLog) {
            await client.query(`
                INSERT INTO activity_log (user_id, lead_id, entity_type, entity_id, action, action_details, created)
                SELECT $1, $2, 'lead', $2, 'lead_sent', $3::jsonb, $4
                WHERE NOT EXISTS (
                    SELECT 1 FROM activity_log
                    WHERE lead_id = $2 AND action = 'lead_sent'
                      AND action_details->>'send_log_id' = $5
                )
            `, [
                SYSTEM_USER_ID,
                s.lead_id,
                JSON.stringify({
                    send_log_id: s.id,
                    buyer_name: 'iSpeedToLead',
                    send_source: 'worker',
                    status: s.status,
                    response_code: s.response_code,
                }),
                s.created,
                s.id,
            ]);
            counts.activities++;
        }

        console.log(`  ✓ ${counts.activities} activity_log entries\n`);

        await client.query('COMMIT');

        console.log('=== Migration complete ===');
        console.log(`  Counties:          ${counts.counties}`);
        console.log(`  Leads:             ${counts.leads}`);
        console.log(`  Send logs:         ${counts.sendLog}`);
        console.log(`  Buyer outcomes:    ${counts.outcomes}`);
        console.log(`  Activity entries:  ${counts.activities}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nMigration failed — rolled back all changes.');
        throw err;
    }

    await client.end();
}

main().catch(err => {
    console.error('\nError:', err.message);
    process.exit(1);
});
