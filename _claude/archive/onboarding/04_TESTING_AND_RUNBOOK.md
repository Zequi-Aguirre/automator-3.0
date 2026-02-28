# Testing and Runbook

## Local Development Setup

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL)
- Doppler CLI: `brew install dopplerhq/cli/doppler` (macOS)

### Initial Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Doppler** (one-time)
   ```bash
   doppler login
   doppler setup --project automator --config dev
   ```

3. **Start local database**
   ```bash
   npm run dev-db-start    # Starts Postgres:15 container
   npm run dev-db-migrate  # Runs all migrations
   npm run dev-db-seed     # Seeds default users + settings
   ```

4. **Verify database**
   ```bash
   # Connect to DB (credentials from Doppler)
   doppler run -c dev --scope automator -- psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_DB"

   # Check tables
   \dt

   # Check seeded users
   SELECT email, role FROM users;
   ```

### Running Dev Servers

**Option 1: Separate terminals**
```bash
# Terminal 1: Frontend
npm run dev-fe

# Terminal 2: Backend
npm run dev-be

# Terminal 3: Tailwind (if editing CSS)
npm run dev-css
```

**Option 2: Concurrent** (if you add npm-run-all script)
```bash
# Not currently configured, but possible with:
# "dev": "concurrently \"npm run dev-fe\" \"npm run dev-be\" \"npm run dev-css\""
```

### Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5005
- **Database**: localhost:5432 (from Doppler vars)

### Default Users (from seed.sql)

| Email | Password | Role |
|-------|----------|------|
| zequi4real@gmail.com | `<check seed.sql bcrypt hash>` | superadmin |
| admin@admin.com | `<check seed.sql bcrypt hash>` | admin |
| user@user.com | `<check seed.sql bcrypt hash>` | user |
| worker@worker.com | `<check seed.sql bcrypt hash>` | worker |

**Note**: All seed users share same bcrypt hash. Actual password: `<unknown, need to check with team>`

## Database Operations

### Migrations

**Create new migration**:
```bash
npm run create-migration
# Prompts for description
# Generates: postgres/migrations/YYYYMMDDHHMMSS.do._description.sql
```

**Run migrations**:
```bash
npm run dev-db-migrate  # Dev environment
npm run db-migrate      # Uses current Doppler context
```

**Reset database** (destructive):
```bash
npm run dev-db-reset
# Stops DB → starts fresh → migrates → seeds
```

### Manual SQL Access

```bash
# Via Doppler
doppler run -c dev --scope automator -- psql "postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_DB"

# Useful queries
SELECT COUNT(*) FROM leads WHERE deleted IS NULL;
SELECT * FROM worker_settings;
SELECT name, is_paused, last_run FROM jobs;
SELECT * FROM send_log ORDER BY created DESC LIMIT 10;
```

## Building for Production

### Full Build
```bash
npm run build
# Runs: Tailwind → TSC (client) → Vite → TSC (server) → esbuild
# Outputs: dist/server.js, dist/client/
```

### Individual Builds
```bash
npm run build-fe  # Client only
npm run build-be  # Server only
```

### Run Production Build
```bash
npm run start-be
# Runs: node dist/server.js
# Requires production Doppler config or env vars set
```

## Testing

### Current State
**No tests exist**. Jest is configured in package.json but no test files written.

### When Tests Exist (Future)

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage  # Coverage report
```

### Manual Testing Checklist

**Lead Import (CSV)**:
1. Navigate to `/u/leads` (login required)
2. Click "Import Leads"
3. Upload CSV with columns: `name`, `phone`, `email`, `address`, `city`, `state`, `zipcode`, `county`
4. Verify leads appear in table
5. Check console for trash reasons if some missing

**Lead Import (API)**:
```bash
curl -X POST http://localhost:5005/api/leads-intake \
  -H "x-api-key: <LEAD_INTAKE_API_KEY from Doppler>" \
  -H "Content-Type: application/json" \
  -d '[{
    "address": "123 Main St",
    "city": "Miami",
    "state": "FL",
    "county": "MIAMI-DADE",
    "name": "John Doe",
    "phone": "3051234567",
    "email": "john@example.com"
  }]'
```

**Lead Verification**:
1. Click lead in table → opens detail view
2. Fill out form fields (property details, owner info)
3. Click "Verify Lead"
4. Check `verified = true` in DB

**Worker Manual Trigger**:
1. Admin → Worker Settings
2. Click "Force Send Next Lead"
3. Check `send_log` table for new entry
4. Check lead `sent = true`, `sent_date` populated

**Mock Vendor Testing** (non-production):
```bash
# Check mock vendor received payload
SELECT payload FROM vendor_receives ORDER BY received_at DESC LIMIT 1;
```

## Debugging

### Backend Logs
```bash
# Nodemon output shows:
# - SQL queries (from pg-promise)
# - Worker cron executions
# - Job execution logs
# - Vendor send attempts
# - Error stack traces
```

### Frontend Logs
- Browser console (React errors, API call failures)
- Network tab (check API responses)

### Common Issues

**Database connection fails**:
```bash
# Check Doppler vars loaded
doppler run -c dev --scope automator -- printenv | grep DB_

# Check container running
docker ps | grep postgres

# Restart container
npm run dev-db-stop
npm run dev-db-start
```

**Worker not running**:
```sql
-- Check worker enabled
SELECT worker_enabled, cron_schedule FROM worker_settings;

-- Enable worker
UPDATE worker_settings SET worker_enabled = true WHERE id = '123e4567-e89b-12d3-b456-226600000501';

-- Restart backend to pick up change
```

**Leads not sending**:
```sql
-- Check eligible leads
SELECT COUNT(*) FROM leads
WHERE verified = true
  AND sent = false
  AND deleted IS NULL;

-- Check blacklisted entities
SELECT name, blacklisted FROM counties WHERE blacklisted = true;
SELECT name, blacklisted FROM investors WHERE blacklisted = true;

-- Check cooldowns
SELECT county_id, MAX(created) as last_send
FROM send_log
GROUP BY county_id
ORDER BY last_send DESC;
```

**JWT expired**:
- Frontend refreshes token automatically if < 4h remaining
- Check `New-Token` response header
- If expired, re-login

## Deployment Checklist

**Pre-deploy**:
- [ ] Run `npm run lint` (0 warnings FE, < 1000 BE)
- [ ] Run `npm run build` (no errors)
- [ ] Check migrations applied: `doppler run -c <env> -- npm run db-migrate`
- [ ] Verify env vars in Doppler (staging/prod config)

**Post-deploy**:
- [ ] Check server starts: `npm run start-be`
- [ ] Test `/api/authenticate` endpoint (login works)
- [ ] Verify worker status in admin UI
- [ ] Check last send log timestamp
- [ ] Monitor error logs for 10 minutes

**Rollback**:
- Deploy previous git commit
- Revert migrations if schema changed (`.undo._` files)

## Performance Monitoring

**Current State**: No APM/monitoring tools configured

**Manual Checks**:
```sql
-- Slow queries (if pg_stat_statements enabled)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Lead volume by status
SELECT
    COUNT(*) FILTER (WHERE verified = false AND sent = false) as new_leads,
    COUNT(*) FILTER (WHERE verified = true AND sent = false) as verified_unsent,
    COUNT(*) FILTER (WHERE sent = true) as sent_leads,
    COUNT(*) FILTER (WHERE deleted IS NOT NULL) as trashed_leads
FROM leads;
```
