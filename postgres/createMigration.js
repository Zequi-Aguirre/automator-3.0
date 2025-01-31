const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// use by running:
// npm run create-migration new_migration_name

// Directory where migrations are stored
const migrationsDir = path.join(__dirname, './migrations');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir);
}

// Get timestamp and name argument
const timestamp = format(new Date(), 'yyyyMMddHHmmss');
const migrationName = process.argv[2] || 'unnamed_migration';
const fileName = `${timestamp}.do._${migrationName}.sql`;

console.log(`Creating migration: ${fileName}`);

// Create empty SQL file
const filePath = path.join(migrationsDir, fileName);
fs.writeFileSync(filePath, '–- Write your migration here\n');

console.log(`Migration created: ${filePath}`);