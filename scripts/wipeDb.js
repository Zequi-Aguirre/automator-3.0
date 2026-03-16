#!/usr/bin/env node
/**
 * Wipe all tables from the target database.
 *
 * Usage:
 *   npm run delete-prod-db
 *
 * This drops and recreates the public schema, wiping all tables, sequences,
 * indexes, and migration history. Run migrations + import after this.
 *
 * Requires typing the database name to confirm — this cannot be undone.
 */

const { Client } = require('pg');
const readline = require('readline');

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

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
    const host = process.env.DB_HOST;
    const dbName = process.env.DB_DB;

    console.log('\n⚠️  WARNING: DATABASE WIPE ⚠️');
    console.log('================================');
    console.log(`  Host:     ${host}`);
    console.log(`  Database: ${dbName}`);
    console.log('================================');
    console.log('This will DROP and recreate the public schema.');
    console.log('ALL data, tables, and migration history will be permanently deleted.\n');

    const answer = await ask(`Type the database name "${dbName}" to confirm: `);

    if (answer !== dbName) {
        console.log('\nAborted — input did not match. No changes made.');
        process.exit(0);
    }

    const client = buildClient();
    console.log(`\nConnecting to ${host}/${dbName}...`);
    await client.connect();
    console.log('Connected.\n');

    console.log('Wiping database...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO PUBLIC');
    await client.end();

    console.log(`\n✓ Database "${dbName}" wiped successfully.`);
    console.log('Next steps:');
    console.log('  1. Run migrations:  npm run db-migrate (or deploy triggers pre-deploy)');
    console.log('  2. Import data:     npm run import-prod-data-prd');
}

main().catch(err => {
    console.error('\nFailed:', err.message);
    process.exit(1);
});
