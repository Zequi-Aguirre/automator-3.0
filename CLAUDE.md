# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 CRITICAL: Ticket-Driven Development

**ALWAYS work within the ticket system. This is core behavior.**

**Before ANY work:**
1. Check `_claude/planning/08_TICKETS.md` for existing tickets
2. If no ticket exists → Create one in `08_TICKETS.md` or `FUTURE_ENHANCEMENTS.md`
3. Reference ticket # in ALL commits

**When you find a bug:**
- Create a ticket documenting it
- Fix it
- Mark ticket complete

**When completing work:**
- Update ticket status in `08_TICKETS.md`
- Update `CURRENT_SPRINT.md` with what was done
- Check off acceptance criteria

**When blocked:**
- Document blocker in ticket
- Create follow-up ticket if needed
- Update `CURRENT_SPRINT.md`

**Full behavior details:** See `_claude/context/BEHAVIORAL_CONTEXT.md` → Section 2

## 🚨 CRITICAL: Git Workflow - NEVER Commit to Main Branches

**ALWAYS use feature branches and pull requests. This is mandatory.**

### Proper Git Workflow

**1. NEVER commit directly to:**
- `main` - Production branch
- `develop` - Integration branch

**2. Always create a feature branch:**
```bash
# Create descriptive branch name
git checkout -b feature/ticket-number-short-description
# Examples:
#   feature/ticket-005-remove-details-button
#   feature/quick-wins-1-and-5
#   feature/bug-001-fix-csv-import
```

**3. Work on feature branch:**
- Make commits with proper messages
- Reference ticket numbers
- Include Co-Authored-By trailer

**4. Push and create PR:**
```bash
git push -u origin feature/your-branch-name
# Then create PR to develop via GitHub/GitLab UI
```

**5. After PR is merged:**
```bash
git checkout develop
git pull origin develop
git branch -d feature/your-branch-name  # Delete local branch
```

### If You Accidentally Commit to develop/main

**Immediately revert:**
```bash
# Reset to before your commits
git log --oneline -5  # Find commit hash before your work
git reset --hard <commit-hash>

# Create feature branch
git checkout -b feature/your-work

# Re-apply your changes on the feature branch
```

### Commit Message Format

```
<type>: <subject> (#ticket-number)

<optional body with details>

Ticket: <ticket-file>#<ticket-number>
Related: <related tickets>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** feat, fix, docs, refactor, test, chore

## Project Overview

Automator 2.0 is a Node.js + TypeScript lead automation platform for real estate. It ingests leads via CSV, validates them, applies business rules (blacklists, cooldowns), and dispatches them to external buyers via webhooks. The system includes a background worker/scheduler with per-buyer timing control, admin dashboard, and multi-buyer support with flexible routing (manual, worker, or both).

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
  - **Orchestrator services**: Cross-entity workflows (e.g., LeadService coordinates leads/counties, BuyerDispatchService handles buyer routing)
- **resources/** - Express route handlers: parse inputs, call services, return HTTP responses
- **middleware/** - Authentication, CSV parsing, token generation
- **worker/** - Background job scheduler (SendLeadsJob, TrashExpireLeadsJob)
- **adapters/** - External API adapters (BuyerWebhookAdapter for generic buyer webhook dispatch)
- **types/** - Single source of truth for domain types and DTOs

### Frontend (client/src/)

React 18 + Vite + TypeScript with MUI components, Tailwind CSS, and React Context for state management.

## Key Business Rules

- **Soft-delete enforcement**: Records are never permanently removed (`deleted IS NULL` = active)
- **Lead lifecycle**: Imported → Verified → Dispatched to Buyers → Logged
- **Blacklist logic**: If any linked entity (affiliate, campaign, county) is blacklisted, the lead is filtered out
- **Per-buyer cooldowns**: Each buyer has configurable min/max minutes between sends with randomized timing
- **Whitelist logic**: County whitelists override cooldowns and are consumed after one use
- **Buyer dispatch modes**:
  - `manual`: Only via UI/API calls
  - `worker`: Only via background worker
  - `both`: Available for both manual and worker dispatch
- **Lead reuse**: Buyers can be configured with `allow_resell=true` to receive leads that have been sent to other buyers

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

- **LeadService** - Lead lifecycle management (import, verify, trash, enable worker)
- **BuyerDispatchService** - Core buyer dispatch orchestrator:
  - Validates if lead can be sent to buyer (cooldowns, resell rules, blacklists)
  - Builds payload and sends via BuyerWebhookAdapter
  - Creates send_log records
  - Updates buyer timing (next_send_at for worker randomization)
  - Handles lead_buyer_outcomes for sold status tracking
- **WorkerService** - Background worker controller:
  - Iterates through all buyers with dispatch_mode='worker' or 'both'
  - Delegates to BuyerDispatchService.processBuyerQueue() for each buyer
  - Respects per-buyer timing windows
- **JobService** - Scheduler manager connecting cron definitions to worker handlers
- **CountyService** - County management including blacklist/whitelist logic

## Buyers Architecture

The system uses a **buyer-based dispatch architecture** where leads are routed to multiple buyers via webhooks.

### Buyers Table Schema
Each buyer has:
- `webhook_url` - POST endpoint for lead delivery
- `dispatch_mode` - 'manual', 'worker', or 'both'
- `priority` - Lower number = higher priority (for worker processing order)
- `auto_send` - Auto-dispatch on lead import if true
- `allow_resell` - Can receive leads already sent to other buyers
- `requires_validation` - Lead must be verified before sending
- Per-buyer timing: `min_minutes_between_sends`, `max_minutes_between_sends`, `next_send_at`
- Authentication: `auth_header_name`, `auth_header_prefix`, `auth_token_encrypted`

### Dispatch Flow
1. **Manual send**: UI → LeadResource → LeadService.sendLeadToBuyer() → BuyerDispatchService
2. **Worker send**: Cron → SendLeadsJob → WorkerService.processAllBuyers() → BuyerDispatchService.processBuyerQueue()
3. **Auto-send**: CSV import → LeadService.importLeads() → BuyerDispatchService (for auto_send=true buyers)

All paths converge at **BuyerDispatchService.sendLeadToBuyer()** which:
- Validates send eligibility (cooldowns, resell rules, blacklists)
- Sends via BuyerWebhookAdapter with buyer's auth config
- Creates send_log record
- Updates buyer's next_send_at (for worker timing randomization)

### Lead Reuse System
- `lead_buyer_outcomes` table tracks many-to-many sold relationships
- Buyers with `allow_resell=false` will not receive leads already sent to them
- Buyers with `allow_resell=true` can receive leads regardless of prior sends
- Sold status tracked per lead-buyer pair

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