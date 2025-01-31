#!/bin/bash
set -e

# Load the seed SQL file into the database
psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_DB" -f ./seed.sql

echo "Database seeding complete."