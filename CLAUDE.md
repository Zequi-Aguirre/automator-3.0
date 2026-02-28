# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Automator 2.0 is a Node.js + TypeScript lead automation platform for real estate. It ingests leads via CSV, validates them, applies business rules (blacklists, whitelists, cooldowns), and dispatches them to external vendors (like iSpeedToLead). The system includes a background worker/scheduler, admin dashboard, and multi-vendor support (MVP in development).

## Common Commands

### Development
```bash
npm run dev-fe              # Frontend: Vite dev server with Doppler secrets
npm run dev-be              # Backend: Nodemon watching server/src/main/server.ts
npm run dev-css             # Tailwind CSS watch mode
```

### Database (Local PostgreSQL via Docker)
```bash
npm run dev-db-start        # Start local PostgreSQL container
npm run dev-db-migrate      # Run database migrations
npm run dev-db-seed         # Seed initial data
npm run dev-db-reset        # Full reset: stop → start → migrate → seed
npm run create-migration    # Create new migration file
```

### Build & Lint
```bash
npm run build               # Full build: Tailwind → frontend → backend
npm run build-fe            # TSC + Vite bundle for client
npm run build-be            # TSC + esbuild bundler for server
npm run lint                # Run both frontend and backend linting
npm run lint-fe             # ESLint client (strict, 0 warnings allowed)
npm run lint-be             # ESLint server (max 1000 warnings)
```

### Production
```bash
npm run start-be            # Run compiled server from dist/server.js
```

## Architecture

The codebase follows a **layered clean architecture** with tsyringe dependency injection.

### Backend Layers (server/src/main/)

- **config/** - Environment setup, DBContainer (pg-promise), DI container initialization
- **data/** - DAOs: SQL execution only, soft delete filtering, no HTTP/Express imports
- **services/** - Business logic with two types:
  - **Entity services (thin)**: Single-entity CRUD, call only DAOs
  - **Orchestrator services**: Cross-entity workflows (e.g., LeadService coordinates affiliate/campaign/county/investor)
- **resources/** - Express route handlers: parse inputs, call services, return HTTP responses
- **middleware/** - Authentication, CSV parsing, token generation
- **worker/** - Background job scheduler (SendLeadsJob, TrashExpireLeadsJob)
- **vendor/** - External API adapters (IAO = Incoming Affiliate Organization pattern)
- **types/** - Single source of truth for domain types and DTOs

### Frontend (client/src/)

React 18 + Vite + TypeScript with MUI components, Tailwind CSS, and React Context for state management.

## Key Business Rules

- **Soft-delete enforcement**: Records are never permanently removed (`deleted IS NULL` = active)
- **Lead lifecycle**: Imported → Verified → Sent → Logged
- **Blacklist logic**: If any linked entity (affiliate, investor, campaign, county) is blacklisted, the lead is trashed
- **Cooldown logic**: Prevents sending multiple leads from same county/investor within configured time
- **Whitelist logic**: Overrides cooldowns but entries are consumed after one use
- **Vendor-safe routing**: In non-production (`NODE_ENV !== 'production'`), leads route to `vendorReceiveDAO` (local storage) instead of external vendor APIs

## Database Conventions

- UUID primary keys (`gen_random_uuid()`)
- Soft deletes: `deleted` timestamptz column (NULL = active)
- **CRITICAL: Timestamp naming convention**
  - Audit fields: `created`, `modified`, `deleted` (NO `_at` suffix)
  - Exception: Only `buyers` and `lead_buyer_outcomes` use `created_at`, `modified_at`, `deleted_at`
  - For all other tables: Use `created`, `modified`, `deleted` (without `_at`)
  - Common mistake: Using `deleted_at` instead of `deleted` in queries
- Migrations in `postgres/migrations/`

## DAO Contract

- Execute SQL, return typed results, enforce soft-delete filters
- No imports from resources/controllers
- Return conventions:
  - `getById`: `Promise<T | null>`
  - `list/getMany`: `Promise<{ items: T[]; count: number }>`
  - `create/update/trash`: return updated row via `RETURNING *`
- Generic update-by-id methods do NOT support setting fields to NULL; use dedicated methods for that

## Core Services

- **LeadService** - Central orchestrator for lead lifecycle (import, verify, dispatch)
- **WorkerService** - Automation controller for scheduled lead dispatch with cooldown/timing enforcement
- **JobService** - Scheduler manager connecting job definitions to worker handlers
- **SettingsService** - Runtime configuration manager for worker timing and scheduling

## Documentation & Extended Context

### Primary Documentation Folder: `_claude/`

**IMPORTANT:** The `_claude/` folder is the **primary source of truth** for project planning, architecture decisions, and sprint tracking. Always check this folder FIRST for broader context.

**Structure:**
- `_claude/planning/` - **Active sprint planning and tickets**
  - `README.md` - Overview of buyers refactor plan
  - `08_TICKETS.md` - All 41 tickets with acceptance criteria
  - `CURRENT_SPRINT.md` - Current sprint work and completed tasks
  - `FUTURE_ENHANCEMENTS.md` - Backlog of UI/UX improvements
  - Other numbered docs (00-10) cover architecture, migration strategy, risks, etc.
- `_claude/context/` - Project context and reference materials
- `_claude/archive/` - Completed work and historical decisions
- `_claude/session/` - Session notes and temporary working files

**When to use `_claude/`:**
- Starting a new session → Read `_claude/planning/README.md` for current project state
- Planning work → Check `CURRENT_SPRINT.md` and `08_TICKETS.md`
- Looking for architectural decisions → Check `_claude/planning/` numbered docs
- Documenting completed work → Update `CURRENT_SPRINT.md`
- Adding future tickets → Add to `FUTURE_ENHANCEMENTS.md`

**See `_claude/HOW_TO_USE.md` for complete tutorial on using this folder structure.**

### Legacy Documentation: `docs/AI/`

Older AI-generated docs (may be outdated, refer to `_claude/` for current info):
- `BASELINE/ARCHITECTURE.md` - Backend architecture baseline
- `BASELINE/DAO_CONTRACT.md` - DAO responsibilities and patterns
- `SERVICE_BEHAVIOR_SUMMARY.md` - Detailed service behaviors
- `BRANCHES/MULTIVENDOR_MVP.md` - Multi-vendor implementation roadmap