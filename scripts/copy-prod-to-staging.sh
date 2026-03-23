#!/bin/bash
# Copy production database to staging or local dev for safe testing.
#
# Usage:
#   npm run copy-prod-to-staging   # → staging
#   npm run copy-prod-to-local     # → local dev (Docker)
#   bash scripts/copy-prod-to-staging.sh [stg|dev]  (default: stg)
#
# Requires: Doppler CLI authenticated with access to automator prd + target configs.
# WARNING: This OVERWRITES the target database completely.

set -e

TARGET="${1:-stg}"

if [[ "$TARGET" != "stg" && "$TARGET" != "dev" ]]; then
    echo "Unknown target '$TARGET'. Use 'stg' or 'dev'."
    exit 1
fi

DUMP_FILE="/tmp/automator_prod_$(date +%Y%m%d_%H%M%S).dump"

cleanup() {
    rm -f "$DUMP_FILE"
}
trap cleanup EXIT

echo "=== Automator: Copy prod → $TARGET ==="
echo ""

# ── Read prod credentials ────────────────────────────────────────────────────
echo "Reading prod credentials..."
PROD_HOST=$(doppler secrets get DB_HOST --plain -c prd --scope automator)
PROD_PORT=$(doppler secrets get DB_PORT --plain -c prd --scope automator)
PROD_DB=$(doppler secrets get DB_DB --plain -c prd --scope automator)
PROD_USER=$(doppler secrets get DB_USER --plain -c prd --scope automator)
PROD_PASS=$(doppler secrets get DB_PASS --plain -c prd --scope automator)

if [[ "$PROD_HOST" == dpg-* ]]; then
    PROD_HOST="${PROD_HOST}.oregon-postgres.render.com"
fi

# ── Read target credentials ──────────────────────────────────────────────────
echo "Reading $TARGET credentials..."
TGT_HOST=$(doppler secrets get DB_HOST --plain -c "$TARGET" --scope automator)
TGT_PORT=$(doppler secrets get DB_PORT --plain -c "$TARGET" --scope automator)
TGT_DB=$(doppler secrets get DB_DB --plain -c "$TARGET" --scope automator)
TGT_USER=$(doppler secrets get DB_USER --plain -c "$TARGET" --scope automator)
TGT_PASS=$(doppler secrets get DB_PASS --plain -c "$TARGET" --scope automator)

TGT_SSL=false
if [[ "$TGT_HOST" == dpg-* ]]; then
    TGT_HOST="${TGT_HOST}.oregon-postgres.render.com"
    TGT_SSL=true
fi

echo ""
echo "Source:      ${PROD_HOST}/${PROD_DB}"
echo "Destination: ${TGT_HOST}/${TGT_DB} ($TARGET)"
echo ""
echo "WARNING: This will OVERWRITE the $TARGET database."
read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# ── Dump prod ────────────────────────────────────────────────────────────────
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
echo "  ✓ Dump complete"

# ── Restore to target ────────────────────────────────────────────────────────
echo ""
echo "Dropping and recreating $TARGET schema..."

if [[ "$TGT_SSL" == "true" ]]; then
    PGPASSWORD="$TGT_PASS" psql \
        "postgresql://${TGT_USER}:${TGT_PASS}@${TGT_HOST}:${TGT_PORT}/${TGT_DB}?sslmode=require" \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
else
    PGPASSWORD="$TGT_PASS" psql \
        -h "$TGT_HOST" \
        -p "$TGT_PORT" \
        -U "$TGT_USER" \
        -d "$TGT_DB" \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
fi

echo ""
echo "Restoring to $TARGET..."
if [[ "$TGT_SSL" == "true" ]]; then
    PGPASSWORD="$TGT_PASS" pg_restore \
        -d "postgresql://${TGT_USER}:${TGT_PASS}@${TGT_HOST}:${TGT_PORT}/${TGT_DB}?sslmode=require" \
        --no-owner \
        --no-privileges \
        "$DUMP_FILE"
else
    PGPASSWORD="$TGT_PASS" pg_restore \
        -h "$TGT_HOST" \
        -p "$TGT_PORT" \
        -U "$TGT_USER" \
        -d "$TGT_DB" \
        --no-owner \
        --no-privileges \
        "$DUMP_FILE"
fi

echo ""
echo "=== Done. $TARGET is now a full copy of production. ==="
