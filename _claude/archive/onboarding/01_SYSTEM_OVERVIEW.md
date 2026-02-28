# System Overview

## What This System Does

Automator 2.0 automates lead distribution for real estate investors. It:
- Ingests leads via CSV upload or REST API
- Validates against blacklists and applies cooldown rules
- Dispatches verified leads to external vendors (iSpeedToLead)
- Enforces business hours, geographic constraints, and timing delays
- Provides admin dashboard for lead/entity management

## Architecture

**Backend**: Node.js + TypeScript + Express + pg-promise + tsyringe DI

```
server/src/main/
├── server.ts           # Entry point
├── AutomatorServer.ts  # Express app setup, route registration
├── config/             # EnvConfig, DBContainer (pg-promise)
├── data/               # DAOs (SQL only, soft-delete filtering)
├── services/           # Business logic (entity + orchestrator services)
├── resources/          # Express route handlers (HTTP → service calls)
├── middleware/         # Auth (JWT + API key), CSV parsing
├── worker/             # Cron scheduler + background jobs
├── vendor/             # External API adapters (iSpeedToLeadIAO)
└── types/              # TypeScript type definitions
```

**Frontend**: React 18 + Vite + MUI + Tailwind CSS

```
client/src/
├── App.tsx             # Root component, ThemeProvider
├── components/         # UI components (admin/, common/, navBar/)
├── views/              # Pages (adminViews/, userViews/)
├── context/            # React Context (auth, state)
├── services/           # API client functions
└── middleware/         # Route protection (VerifyUser)
```

**Database**: PostgreSQL (pg-promise)
- Migrations: `postgres/migrations/` (Postgrator)
- Seed: `postgres/seed.sql`
- Local dev: Docker container

## Key Components

### Backend Services

| Service | Responsibility |
|---------|---------------|
| **LeadService** | Lead lifecycle (import, verify, send, trash) |
| **WorkerService** | Lead selection, filtering (blacklist/cooldown/timezone), scheduling |
| **JobService** | Background job coordination |
| **SettingsService** | Worker configuration management |
| Entity services | CRUD for affiliates, campaigns, investors, counties, users |

### Worker System

- **Worker.ts**: Cron-based scheduler (reads `worker_settings.cron_schedule`)
- **SendLeadsJob**: Checks timing, sends next eligible lead
- **TrashExpireLeadsJob**: Soft-deletes expired leads (configurable hours)

### API Endpoints

**Auth**: JWT-based (24h expiry, auto-renewal < 4h remaining)

**Admin** (JWT + admin role):
- `/api/affiliates`, `/api/campaigns`, `/api/investors`, `/api/counties`
- `/api/jobs`, `/api/settings`, `/api/worker`, `/api/users`, `/api/logs`

**User** (JWT):
- `/api/leads` (list, view, update, verify, trash, CSV import)
- `/api/leads-form-input` (CRUD form data)

**Public/API Key**:
- `POST /api/leads-intake` (x-api-key header, programmatic lead ingestion)
- `GET /api/leads-open/:id` (no auth)

**Mock Vendor** (non-production):
- `POST /api/mock-vendor` (simulates vendor webhook)

## External Integrations

1. **iSpeedToLead**: HTTP POST webhook for lead delivery
   - Environment-aware: Non-production routes to `vendor_receives` table
2. **Doppler**: Secrets management (DB creds, JWT secret, API keys)
3. **PostgreSQL**: Primary data store

## Deployment Architecture

- **Dev**: Vite dev server (5173), Nodemon (5005), local Docker Postgres
- **Production**: Compiled server (`dist/server.js`), environment via Doppler
- **Worker**: Runs in same process as API server if `worker_enabled=true`

## Multi-Vendor MVP (In Progress)

- `vendors` table exists
- `vendor_id` columns added to `leads` and `send_log`
- Routing logic incomplete (see `docs/AI/BRANCHES/MULTIVENDOR_MVP.md`)
