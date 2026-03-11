/**
 * Populate ALL ZIP codes for ALL counties using comprehensive free dataset
 * Downloads from reliable public source
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const COUNTIES_CSV = path.join(__dirname, '..', 'allCounties.csv');
const TEMP_ZIP_FILE = path.join(__dirname, 'temp_zip_data.csv');

// Using open public dataset with 40,000+ US ZIP codes
const ZIP_DATA_URL = 'https://raw.githubusercontent.com/scpike/us-state-county-zip/master/geo-data.csv';

console.log('🚀 Starting comprehensive ZIP code population...\n');

// Download the dataset
console.log('📥 Downloading comprehensive ZIP code dataset...');
https.get(ZIP_DATA_URL, (response) => {
    if (response.statusCode !== 200) {
        console.error(`❌ Download failed: HTTP ${response.statusCode}`);
        process.exit(1);
    }

    const file = fs.createWriteStream(TEMP_ZIP_FILE);
    response.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('✅ Download complete!\n');
        processData();
    });
}).on('error', (err) => {
    console.error('❌ Download error:', err.message);
    process.exit(1);
});

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function buildCSVLine(fields) {
    return fields.map(f => {
        const str = String(f);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }).join(',');
}

function processData() {
    console.log('📊 Building ZIP-to-County mapping...');

    // Read downloaded ZIP data
    const zipData = fs.readFileSync(TEMP_ZIP_FILE, 'utf-8');
    const zipLines = zipData.split('\n');

    // Build mapping: "County,ST" -> [zips]
    const countyZips = new Map();

    // Parse ZIP data (format: state_fips,state,state_abbr,zipcode,county,city)
    for (let i = 1; i < zipLines.length; i++) {
        const line = zipLines[i].trim();
        if (!line) continue;

        const parts = parseCSVLine(line);
        if (parts.length < 5) continue;

        const state = parts[2];  // state_abbr
        const zip = parts[3];     // zipcode
        let county = parts[4];    // county

        // Clean up county name
        county = county
            .replace(/\s+County$/i, '')
            .replace(/\s+Parish$/i, '')
            .replace(/\s+Borough$/i, '')
            .replace(/\s+Census Area$/i, '')
            .replace(/^St\.\s+/i, 'Saint ')
            .trim();

        if (!zip || !state || !county) continue;

        const key = `${county},${state}`;

        if (!countyZips.has(key)) {
            countyZips.set(key, new Set());
        }
        countyZips.get(key).add(zip);
    }

    console.log(`✅ Mapped ${countyZips.size} counties\n`);

    // Read counties CSV
    console.log('📖 Reading counties CSV...');
    const countiesContent = fs.readFileSync(COUNTIES_CSV, 'utf-8');
    const countiesLines = countiesContent.split('\n');

    const header = parseCSVLine(countiesLines[0]);
    const nameIdx = header.indexOf('name');
    const stateIdx = header.indexOf('state');
    const zipIdx = header.indexOf('zip_codes');

    if (zipIdx === -1) {
        console.error('❌ zip_codes column not found!');
        process.exit(1);
    }

    console.log(`📝 Processing ${countiesLines.length - 1} counties...\n`);

    // Process each county
    const newLines = [countiesLines[0]];
    let matched = 0;
    let notMatched = 0;

    for (let i = 1; i < countiesLines.length; i++) {
        const line = countiesLines[i].trim();
        if (!line) {
            newLines.push('');
            continue;
        }

        const fields = parseCSVLine(line);
        if (fields.length <= zipIdx) {
            newLines.push(line);
            continue;
        }

        const county = fields[nameIdx];
        const state = fields[stateIdx];

        // Try different variations (normalize both sides)
        const normalizedCounty = county
            .replace(/\s+County$/i, '')
            .replace(/\s+Parish$/i, '')
            .replace(/^St\.\s+/i, 'Saint ')
            .replace(/^St\s+/i, 'Saint ')
            .trim();

        const keys = [
            `${county},${state}`,
            `${normalizedCounty},${state}`,
            `${county.replace(' County', '')},${state}`,
            `${county.replace(' Parish', '')},${state}`,
            `${county.replace('Saint ', 'St. ')},${state}`,
        ];

        let found = false;
        for (const key of keys) {
            const zips = countyZips.get(key);
            if (zips && zips.size > 0) {
                const zipArray = Array.from(zips).sort();
                fields[zipIdx] = zipArray.join('|');
                matched++;
                found = true;
                if (matched % 200 === 0) {
                    console.log(`   ✓ ${matched} counties matched...`);
                }
                break;
            }
        }

        if (!found) {
            fields[zipIdx] = '';
            notMatched++;
        }

        newLines.push(buildCSVLine(fields));
    }

    // Save updated CSV
    const backup = `${COUNTIES_CSV}.backup-${Date.now()}`;
    fs.copyFileSync(COUNTIES_CSV, backup);
    fs.writeFileSync(COUNTIES_CSV, newLines.join('\n'));

    // Cleanup
    fs.unlinkSync(TEMP_ZIP_FILE);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Matched:    ${matched} counties (${((matched / (matched + notMatched)) * 100).toFixed(1)}%)`);
    console.log(`⚠️  Unmatched:  ${notMatched} counties`);
    console.log(`📦 Backup:     ${path.basename(backup)}`);
    console.log(`💾 Updated:    allCounties.csv`);
    console.log('\n✨ Your CSV is ready! Import it via the UI.\n');
}
