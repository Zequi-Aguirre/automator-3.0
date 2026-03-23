#!/bin/bash
# Copy production database to staging for safe testing.
#
# Usage:
#   npm run copy-prod-to-staging
#   (or: bash scripts/copy-prod-to-staging.sh)
#
# Requires: Doppler CLI authenticated with access to automator prd + stg configs.
# WARNING: This OVERWRITES the staging database completely.

set -e

DUMP_FILE="/tmp/automator_prod_$(date +%Y%m%d_%H%M%S).dump"

cleanup() {
    rm -f "$DUMP_FILE"
}
trap cleanup EXIT

echo "=== Automator: Copy prod → staging ==="
echo ""

# Build prod connection URL from Doppler
echo "Reading prod credentials..."
PROD_HOST=$(doppler secrets get DB_HOST --plain -c prd --scope automator)
PROD_PORT=$(doppler secrets get DB_PORT --plain -c prd --scope automator)
PROD_DB=$(doppler secrets get DB_DB --plain -c prd --scope automator)
PROD_USER=$(doppler secrets get DB_USER --plain -c prd --scope automator)
PROD_PASS=$(doppler secrets get DB_PASS --plain -c prd --scope automator)

# Render hostnames need the full .oregon-postgres.render.com suffix
if [[ "$PROD_HOST" == dpg-* ]]; then
    PROD_HOST="${PROD_HOST}.oregon-postgres.render.com"
fi

PROD_URL="postgresql://${PROD_USER}:${PROD_PASS}@${PROD_HOST}:${PROD_PORT}/${PROD_DB}?sslmode=require"

# Build staging connection URL from Doppler
echo "Reading staging credentials..."
STG_HOST=$(doppler secrets get DB_HOST --plain -c stg --scope automator)
STG_PORT=$(doppler secrets get DB_PORT --plain -c stg --scope automator)
STG_DB=$(doppler secrets get DB_DB --plain -c stg --scope automator)
STG_USER=$(doppler secrets get DB_USER --plain -c stg --scope automator)
STG_PASS=$(doppler secrets get DB_PASS --plain -c stg --scope automator)

if [[ "$STG_HOST" == dpg-* ]]; then
    STG_HOST="${STG_HOST}.oregon-postgres.render.com"
fi

STG_URL="postgresql://${STG_USER}:${STG_PASS}@${STG_HOST}:${STG_PORT}/${STG_DB}?sslmode=require"

echo ""
echo "Source:      ${PROD_HOST}/${PROD_DB}"
echo "Destination: ${STG_HOST}/${STG_DB}"
echo ""
echo "WARNING: This will OVERWRITE the staging database."
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Dumping production database..."
PGPASSWORD="$PROD_PASS" pg_dump \
    -h "$PROD_HOST" \
    -p "$PROD_PORT" \
    -U "$PROD_USER" \
    -d "$PROD_DB" \
    --no-owner \
    --no-privileges \
    -Fc \
    -f "$DUMP_FILE"
echo "  ✓ Dump complete: $DUMP_FILE"

echo ""
echo "Dropping and recreating staging schema..."
PGPASSWORD="$STG_PASS" psql \
    -h "$STG_HOST" \
    -p "$STG_PORT" \
    -U "$STG_USER" \
    -d "$STG_DB" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo ""
echo "Restoring to staging..."
PGPASSWORD="$STG_PASS" pg_restore \
    -h "$STG_HOST" \
    -p "$STG_PORT" \
    -U "$STG_USER" \
    -d "$STG_DB" \
    --no-owner \
    --no-privileges \
    "$DUMP_FILE"

echo ""
echo "=== Done. Staging is now a full copy of production. ==="
