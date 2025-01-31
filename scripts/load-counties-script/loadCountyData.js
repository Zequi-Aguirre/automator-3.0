const fs = require('fs');
require('dotenv').config();
const csv = require('csv-parser');
const { Pool } = require('pg');

// PostgreSQL connection configuration from environment variables
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DB,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function loadCountyData() {
    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        // Create a temporary staging table with proper UUID type
        await client.query(`
            CREATE TEMP TABLE temp_counties (
                id UUID,
                name VARCHAR,
                state VARCHAR,
                population INTEGER
            ) ON COMMIT DROP
        `);

        // Process CSV and load into temporary table
        const results = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream('./scripts/load-counties-script/counties2022.csv')
                .pipe(csv())
                .on('data', (data) => {
                    results.push([
                        data.id, // This will be cast to UUID in the query
                        data.name,
                        data.state,
                        parseInt(data.population, 10) || 0
                    ]);
                })
                .on('end', async () => {
                    try {
                        // Batch insert into temp table with UUID casting
                        for (const row of results) {
                            await client.query(
                                'INSERT INTO temp_counties (id, name, state, population) VALUES ($1::uuid, $2, $3, $4)',
                                row
                            );
                        }
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });

        // Insert from temp table to actual table, handling duplicates
        await client.query(`
            INSERT INTO counties (id, name, state, population)
            SELECT id, name, state, population
            FROM temp_counties
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                state = EXCLUDED.state,
                population = EXCLUDED.population
        `);

        // Commit transaction
        await client.query('COMMIT');

        console.log(`Successfully processed ${results.length} counties`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error loading county data:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
loadCountyData()
    .then(() => console.log('County data load completed'))
    .catch(error => {
        console.error('Failed to load county data:', error);
        process.exit(1);
    });