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
# NOTE: After restore, buyer webhook_url values are updated to include ?env=<target>
#       so Make.com can route sends to the correct tracking sheet.

set -e

# Use PostgreSQL 17 client tools to match the Render server version
PG17_BIN="/opt/homebrew/opt/postgresql@17/bin"
if [[ -d "$PG17_BIN" ]]; then
    export PATH="$PG17_BIN:$PATH"
fi

TARGET="${1:-stg}"

if [[ "$TARGET" != "stg" && "$TARGET" != "dev" ]]; then
    echo "Unknown target '$TARGET'. Use 'stg' or 'dev'."
    exit 1
fi

DUMP_FILE="/tmp/automator_prod_$(date +%Y%m%d_%H%M%S).sql"

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

# ── Dump prod as plain SQL ────────────────────────────────────────────────────
# Plain text format allows us to filter PG17-specific SET commands that
# older local containers don't support (e.g. SET transaction_timeout).
echo ""
echo "Dumping production database..."
PGPASSWORD="$PROD_PASS" pg_dump \
    -h "$PROD_HOST" \
    -p "$PROD_PORT" \
    -U "$PROD_USER" \
    -d "$PROD_DB" \
    --no-owner \
    --no-privileges \
    -Fp \
    -f "$DUMP_FILE"
echo "  ✓ Dump complete"

# ── Reset target schema ──────────────────────────────────────────────────────
echo ""
echo "Dropping and recreating $TARGET schema..."
if [[ "$TGT_SSL" == "true" ]]; then
    TGT_DSN="postgresql://${TGT_USER}:${TGT_PASS}@${TGT_HOST}:${TGT_PORT}/${TGT_DB}?sslmode=require"
    PGPASSWORD="$TGT_PASS" psql "$TGT_DSN" \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
else
    PGPASSWORD="$TGT_PASS" psql \
        -h "$TGT_HOST" -p "$TGT_PORT" -U "$TGT_USER" -d "$TGT_DB" \
        -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
fi

# ── Restore ───────────────────────────────────────────────────────────────────
# Filter SET transaction_timeout — not supported by older Postgres containers.
echo ""
echo "Restoring to $TARGET..."
if [[ "$TGT_SSL" == "true" ]]; then
    grep -v "^SET transaction_timeout" "$DUMP_FILE" \
        | PGPASSWORD="$TGT_PASS" psql "$TGT_DSN" -v ON_ERROR_STOP=0 -q
else
    grep -v "^SET transaction_timeout" "$DUMP_FILE" \
        | PGPASSWORD="$TGT_PASS" psql \
            -h "$TGT_HOST" -p "$TGT_PORT" -U "$TGT_USER" -d "$TGT_DB" \
            -v ON_ERROR_STOP=0 -q
fi
echo "  ✓ Restore complete"

# ── Reset buyer webhook URLs to Make.com + env tag ───────────────────────────
# Prod buyer URLs are real endpoints — not safe to call from non-prod envs.
# Reset all buyers to the Make.com logging webhook (same URL as in migrations)
# with ?buyer=<name>&env=<target> so Make.com routes to the correct sheet.
MAKE_BASE="https://hook.us2.make.com/nqghehzuue7f59zu5bf0gaoynel9javf"
echo ""
echo "Resetting buyer webhook URLs to Make.com (?buyer=<name>&env=$TARGET)..."
TAG_SQL="
UPDATE buyers
SET webhook_url = '${MAKE_BASE}?buyer=' || name || '&env=$TARGET'
WHERE deleted IS NULL;
"
if [[ "$TGT_SSL" == "true" ]]; then
    PGPASSWORD="$TGT_PASS" psql "$TGT_DSN" -c "$TAG_SQL" -q
else
    PGPASSWORD="$TGT_PASS" psql \
        -h "$TGT_HOST" -p "$TGT_PORT" -U "$TGT_USER" -d "$TGT_DB" \
        -c "$TAG_SQL" -q
fi
echo "  ✓ Buyer webhook URLs reset to Make.com"

echo ""
echo "=== Done. $TARGET is now a full copy of production. ==="
echo "    Buyer webhook URLs → Make.com ?buyer=<name>&env=$TARGET"
