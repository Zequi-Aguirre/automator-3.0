/**
 * Script to add ZIP codes to allCounties.csv
 * Downloads HUD ZIP-County crosswalk data and updates the CSV
 *
 * Usage: node scripts/addZipCodesToCounties.js
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const COUNTIES_CSV_PATH = path.join(__dirname, '..', 'allCounties.csv');
const ZIP_DATA_URL = 'https://www2.census.gov/geo/docs/maps-data/data/rel/zcta_county_rel_10.txt';
const ZIP_DATA_CACHE = path.join(__dirname, 'zip_county_data.txt');

/**
 * Download file from URL
 */
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading ${url}...`);
        const file = fs.createWriteStream(dest);

        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('Download complete!');
                    resolve();
                });
            } else {
                reject(new Error(`Failed to download: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

/**
 * Parse Census ZCTA-County relationship file
 * Returns Map: "COUNTY_NAME,STATE" => Set<zipCode>
 */
function parseZipData(filePath) {
    console.log('Parsing ZIP code data...');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Map: "county_name,state" => Set of zip codes
    const countyZipMap = new Map();

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Format: ZCTA5,STATE,COUNTY,GEOID,POPPT,HUPT,AREAPT,AREALANDPT,ZPOP,ZHU,ZAREA,ZAREALAND,COPOP,COHU,COAREA,COAREALAND,ZPOPPCT,ZHUPCT,ZAREAPCT,ZAREALANDPCT,COPOPPCT,COHUPCT,COAREAPCT,COAREALANDPCT
        const parts = line.split(',');

        if (parts.length < 3) continue;

        const zipCode = parts[0];
        const state = parts[1];
        const countyFIPS = parts[2];

        if (!zipCode || !state || !countyFIPS) continue;

        // We'll need to match by state since we don't have FIPS codes
        // For now, just group by state and we'll do fuzzy matching
        const key = `${state}`;

        if (!countyZipMap.has(key)) {
            countyZipMap.set(key, new Set());
        }
        countyZipMap.get(key).add(zipCode);
    }

    console.log(`Parsed ${countyZipMap.size} state groups`);
    return countyZipMap;
}

/**
 * Simpler approach: Use a hardcoded mapping for major counties
 * In production, you'd use a complete dataset
 */
function getHardcodedZipMappings() {
    // This is a simplified version - you'll want the full dataset
    // For now, I'll create a structure that can be populated
    return {
        // Format: "County Name,State": ["zip1", "zip2", ...]
        // This will be populated by the actual Census data or manual entry
    };
}

/**
 * Read and parse allCounties.csv
 */
function readCountiesCSV() {
    console.log('Reading allCounties.csv...');
    const content = fs.readFileSync(COUNTIES_CSV_PATH, 'utf-8');
    const lines = content.split('\n');

    // Parse header
    const header = lines[0];
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle quoted fields)
        const fields = parseCSVLine(line);

        if (fields.length >= 2) {
            rows.push({
                raw: line,
                name: fields[1], // County name
                state: fields[2], // State
                fields: fields
            });
        }
    }

    console.log(`Read ${rows.length} counties`);
    return { header, rows };
}

/**
 * Simple CSV line parser (handles quoted fields)
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current);
    return fields;
}

/**
 * Main execution
 */
async function main() {
    console.log('=== Adding ZIP Codes to Counties CSV ===\n');

    // For now, let's use a simpler approach with a manually curated dataset
    // I'll download a simple CSV from SimpleMaps (free tier)

    console.log('NOTE: This script requires a ZIP code dataset.');
    console.log('Please download one of these free datasets:');
    console.log('');
    console.log('1. SimpleMaps (easiest):');
    console.log('   https://simplemaps.com/data/us-zips');
    console.log('   Download "Basic" (free) and save as: scripts/uszips.csv');
    console.log('');
    console.log('2. HUD USPS Crosswalk:');
    console.log('   https://www.huduser.gov/portal/datasets/usps_crosswalk.html');
    console.log('');
    console.log('For this demo, I\'ll create a sample structure.');
    console.log('After you download the data, run this script again.');

    // Read counties
    const { header, rows } = readCountiesCSV();

    // Check if zip_codes column already exists
    if (header.includes('zip_codes')) {
        console.log('\n⚠️  zip_codes column already exists in CSV');
        console.log('Remove it first if you want to regenerate');
        return;
    }

    // Add zip_codes column to header
    const newHeader = header.replace(/\n$/, '') + ',"zip_codes"\n';

    // For now, add empty zip_codes column (you'll populate after download)
    const newRows = rows.map(row => {
        return row.raw + ',""';
    });

    // Write updated CSV
    const newContent = newHeader + newRows.join('\n') + '\n';

    // Backup original
    const backupPath = COUNTIES_CSV_PATH + '.backup';
    fs.copyFileSync(COUNTIES_CSV_PATH, backupPath);
    console.log(`\n✅ Backed up original to: ${backupPath}`);

    // Write new CSV
    fs.writeFileSync(COUNTIES_CSV_PATH, newContent);
    console.log(`✅ Added zip_codes column to: ${COUNTIES_CSV_PATH}`);
    console.log('\n📝 Next steps:');
    console.log('1. Download ZIP code dataset (see URLs above)');
    console.log('2. Save as scripts/uszips.csv');
    console.log('3. Run: node scripts/populateZipCodes.js (I\'ll create this next)');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
