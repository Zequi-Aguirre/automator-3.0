/**
 * Clean invalid ZIP codes from allCounties.csv
 * Removes any ZIPs that aren't exactly 5 digits
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'allCounties.csv');

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

console.log('🧹 Cleaning invalid ZIP codes from allCounties.csv...\n');

const content = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n');

const header = parseCSVLine(lines[0]);
const zipIdx = header.indexOf('zip_codes');

if (zipIdx === -1) {
    console.error('❌ zip_codes column not found');
    process.exit(1);
}

const newLines = [lines[0]];
let totalZips = 0;
let invalidZips = 0;
let cleanedCounties = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
        newLines.push('');
        continue;
    }

    const fields = parseCSVLine(line);
    if (fields.length <= zipIdx) {
        newLines.push(line);
        continue;
    }

    const zipsStr = fields[zipIdx];
    if (!zipsStr) {
        newLines.push(line);
        continue;
    }

    const zips = zipsStr.split('|').map(z => z.trim());
    const originalCount = zips.length;
    totalZips += originalCount;

    // Filter: keep only valid 5-digit ZIP codes
    const validZips = zips.filter(z => /^\d{5}$/.test(z));
    const removedCount = originalCount - validZips.length;

    if (removedCount > 0) {
        invalidZips += removedCount;
        cleanedCounties++;
        const invalidOnes = zips.filter(z => !/^\d{5}$/.test(z));
        console.log(`   ${fields[1]}, ${fields[2]}: Removed ${removedCount} invalid ZIPs: ${invalidOnes.join(', ')}`);
    }

    fields[zipIdx] = validZips.join('|');
    newLines.push(buildCSVLine(fields));
}

// Backup and save
const backup = `${CSV_PATH}.backup-clean-${Date.now()}`;
fs.copyFileSync(CSV_PATH, backup);
fs.writeFileSync(CSV_PATH, newLines.join('\n'));

console.log('\n' + '='.repeat(60));
console.log('✅ CLEANED!');
console.log('='.repeat(60));
console.log(`📊 Total ZIPs:        ${totalZips.toLocaleString()}`);
console.log(`❌ Invalid removed:   ${invalidZips.toLocaleString()}`);
console.log(`✅ Valid remaining:   ${(totalZips - invalidZips).toLocaleString()}`);
console.log(`🧹 Counties cleaned:  ${cleanedCounties}`);
console.log(`📦 Backup:            ${path.basename(backup)}`);
console.log(`💾 Updated:           allCounties.csv`);
console.log('\n✨ Ready to import!\n');
