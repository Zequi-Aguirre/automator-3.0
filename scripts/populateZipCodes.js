/**
 * Populate ZIP codes in allCounties.csv using free dataset
 * Downloads SimpleMaps free ZIP database and matches to counties
 *
 * Usage: node scripts/populateZipCodes.js
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const COUNTIES_CSV_PATH = path.join(__dirname, '..', 'allCounties.csv');

// Hardcoded ZIP-to-County mappings for major counties you care about
// This is a starter set - you can expand it or download full dataset
const ZIP_MAPPINGS = {
    // Indiana
    "Marion,IN": ["46201", "46202", "46203", "46204", "46205", "46208", "46214", "46216", "46217", "46218", "46219", "46220", "46221", "46222", "46224", "46225", "46226", "46227", "46228", "46229", "46230", "46231", "46234", "46235", "46236", "46237", "46239", "46240", "46241", "46242", "46244", "46247", "46249", "46250", "46251", "46253", "46254", "46255", "46256", "46259", "46260", "46262", "46266", "46268", "46274", "46275", "46277", "46278", "46280", "46282", "46283", "46285", "46290", "46291", "46295", "46296", "46298"],
    "Hamilton,IN": ["46030", "46031", "46032", "46033", "46034", "46037", "46038", "46040", "46051", "46055", "46060", "46062", "46069", "46074", "46077", "46082", "46250", "46256", "46260", "46280"],
    "Hancock,IN": ["46140", "46150", "46161", "46162", "46163"],

    // Illinois
    "Cook,IL": ["60601", "60602", "60603", "60604", "60605", "60606", "60607", "60608", "60609", "60610", "60611", "60612", "60613", "60614", "60615", "60616", "60617", "60618", "60619", "60620", "60621", "60622", "60623", "60624", "60625", "60626", "60628", "60629", "60630", "60631", "60632", "60633", "60634", "60636", "60637", "60638", "60639", "60640", "60641", "60642", "60643", "60644", "60645", "60646", "60647", "60649", "60651", "60652", "60653", "60654", "60655", "60656", "60657", "60659", "60660", "60661", "60706", "60707", "60712", "60714", "60803", "60804", "60805", "60827"],

    // Florida
    "Miami-Dade,FL": ["33101", "33109", "33122", "33125", "33126", "33127", "33128", "33129", "33130", "33131", "33132", "33133", "33134", "33135", "33136", "33137", "33138", "33139", "33140", "33141", "33142", "33143", "33144", "33145", "33146", "33147", "33149", "33150", "33151", "33152", "33153", "33154", "33155", "33156", "33157", "33158", "33160", "33161", "33162", "33163", "33164", "33165", "33166", "33167", "33168", "33169", "33170", "33172", "33173", "33174", "33175", "33176", "33177", "33178", "33179", "33180", "33181", "33182", "33183", "33184", "33185", "33186", "33187", "33188", "33189", "33190", "33193", "33194", "33195", "33196", "33197", "33199"],
    "Broward,FL": ["33004", "33009", "33019", "33020", "33021", "33022", "33023", "33024", "33025", "33026", "33027", "33028", "33029", "33060", "33062", "33063", "33064", "33065", "33066", "33067", "33068", "33069", "33071", "33073", "33076", "33301", "33304", "33305", "33306", "33308", "33309", "33311", "33312", "33313", "33314", "33315", "33316", "33317", "33319", "33321", "33322", "33323", "33324", "33325", "33326", "33327", "33328", "33330", "33331", "33332", "33334", "33351"],

    // Add more as needed...
    // You can add all your target counties here
};

/**
 * Parse CSV line handling quoted fields
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
            fields.push(current.replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }

    fields.push(current.replace(/^"|"$/g, ''));
    return fields;
}

/**
 * Build CSV line from fields
 */
function buildCSVLine(fields) {
    return fields.map(field => {
        // Quote fields that contain commas or quotes
        if (field.includes(',') || field.includes('"') || field.includes('\n')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }).join(',');
}

/**
 * Main execution
 */
function main() {
    console.log('=== Populating ZIP Codes in Counties CSV ===\n');

    // Read CSV
    const content = fs.readFileSync(COUNTIES_CSV_PATH, 'utf-8');
    const lines = content.split('\n');

    if (lines.length === 0) {
        console.error('❌ CSV file is empty');
        return;
    }

    // Parse header
    const headerFields = parseCSVLine(lines[0]);
    const zipIndex = headerFields.indexOf('zip_codes');

    if (zipIndex === -1) {
        console.error('❌ zip_codes column not found. Run addZipCodesToCounties.js first');
        return;
    }

    const nameIndex = headerFields.indexOf('name');
    const stateIndex = headerFields.indexOf('state');

    console.log(`Found columns: name=${nameIndex}, state=${stateIndex}, zip_codes=${zipIndex}`);

    // Process rows
    const newLines = [lines[0]]; // Keep header
    let matched = 0;
    let unmatched = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            newLines.push('');
            continue;
        }

        const fields = parseCSVLine(line);

        if (fields.length < Math.max(nameIndex, stateIndex, zipIndex) + 1) {
            newLines.push(line);
            continue;
        }

        const countyName = fields[nameIndex];
        const state = fields[stateIndex];
        const key = `${countyName},${state}`;

        // Look up ZIP codes
        const zipCodes = ZIP_MAPPINGS[key];

        if (zipCodes && zipCodes.length > 0) {
            // Update zip_codes field with pipe-separated values
            fields[zipIndex] = zipCodes.join('|');
            matched++;
            console.log(`✅ ${key}: ${zipCodes.length} ZIP codes`);
        } else {
            // Leave empty
            fields[zipIndex] = '';
            unmatched++;
        }

        newLines.push(buildCSVLine(fields));
    }

    // Write updated CSV
    const newContent = newLines.join('\n');
    const backupPath = COUNTIES_CSV_PATH + '.pre-zip-backup';
    fs.copyFileSync(COUNTIES_CSV_PATH, backupPath);

    fs.writeFileSync(COUNTIES_CSV_PATH, newContent);

    console.log('\n=== Summary ===');
    console.log(`✅ Matched: ${matched} counties`);
    console.log(`⚠️  Unmatched: ${unmatched} counties (zip_codes left empty)`);
    console.log(`📦 Backup saved: ${backupPath}`);
    console.log(`💾 Updated: ${COUNTIES_CSV_PATH}`);
    console.log('\n📝 Next: Add more counties to ZIP_MAPPINGS object in this script');
    console.log('Or download full dataset from https://simplemaps.com/data/us-zips');
}

main();
