# Engineering Rules

## Architecture Patterns

### Layered Clean Architecture

**Dependency flow** (one direction only):
```
Resources → Services → DAOs → Database
    ↓           ↓         ↓
  HTTP      Business    SQL
```

**Strict separation**:
- DAOs: NEVER import from `resources/` or Express types
- Services: NEVER import from `resources/` (can import DAOs, other services)
- Resources: Import services, parse HTTP, return JSON

### Dependency Injection

- **Framework**: tsyringe
- **Registration**: `AutomatorServer.setup()` registers singletons
- **Pattern**: Constructor injection for all dependencies

```typescript
@injectable()
export default class ExampleService {
    constructor(
        private readonly exampleDAO: ExampleDAO,
        private readonly otherService: OtherService
    ) {}
}
```

## DAO Contract

### Responsibilities
- Execute SQL queries only
- Return typed results
- Enforce soft-delete filtering (`WHERE deleted IS NULL`)
- NO business logic, NO HTTP imports

### Return Conventions

```typescript
getById(id: string): Promise<T | null>
list(filters: Filters): Promise<{ items: T[], count: number }>
create(data: CreateDTO): Promise<T>  // RETURNING *
update(id: string, data: Partial<T>): Promise<T>  // RETURNING *
trash(id: string, reason?: string): Promise<T>  // Set deleted = NOW()
```

### Update Methods
- Generic `update()` does NOT support setting fields to NULL
- Use dedicated methods for NULL updates (e.g., `clearInvestorId()`)

### Soft-Delete Filtering
- All `SELECT` queries: `WHERE deleted IS NULL`
- Trash: `UPDATE table SET deleted = NOW(), deleted_reason = $1 WHERE id = $2`

## Service Patterns

### Two Service Types

**Entity Services (Thin)**:
- Single-entity CRUD operations
- Call only DAOs for that entity
- Examples: `AffiliateService`, `InvestorService`, `CountyService`

**Orchestrator Services**:
- Cross-entity workflows
- Call multiple DAOs and entity services
- Examples: `LeadService`, `WorkerService`, `JobService`

### Example: LeadService (Orchestrator)

```typescript
@injectable()
export default class LeadService {
    constructor(
        private readonly leadDAO: LeadDAO,
        private readonly leadFormInputDAO: LeadFormInputDAO,
        private readonly countyService: CountyService,
        private readonly investorService: InvestorService,
        private readonly iSpeedToLeadIAO: ISpeedToLeadIAO,
        private readonly sendLogDAO: SendLogDAO,
        private readonly workerSettingsDAO: WorkerSettingsDAO
    ) {}

    // Coordinates: lead, county, investor, form, vendor, logging
    async sendLead(leadId: string): Promise<Lead> { ... }
}
```

## Resource Contract

### Responsibilities
- Parse HTTP request (body, params, query, headers)
- Call service methods
- Return HTTP responses (JSON, status codes)
- Handle errors (try/catch, 400/500 responses)

### Pattern

```typescript
@injectable()
export default class ExampleResource {
    private readonly router: Router;

    constructor(private readonly exampleService: ExampleService) {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get("/", async (req, res) => {
            try {
                const result = await this.exampleService.getAll();
                return res.json(result);
            } catch (error) {
                return res.status(500).json({ message: error.message });
            }
        });
    }

    public routes(): Router {
        return this.router;
    }
}
```

## Code Conventions

### TypeScript
- **Strict mode**: enabled in tsconfig.json
- **No any**: Use typed interfaces from `types/`
- **No implicit returns**: All functions explicitly return

### Naming
- **DAOs**: `<Entity>DAO.ts` (e.g., `leadDAO.ts`)
- **Services**: `<entity>Service.ts` (e.g., `leadService.ts`)
- **Resources**: `<entity>Resource.ts` (e.g., `leadResource.ts`)
- **Types**: `<entity>Types.ts` (e.g., `leadTypes.ts`)

### Imports
- Use `.ts` extension in imports: `import { X } from "./file.ts"`
- Relative imports for same layer: `import { LeadDAO } from "../data/leadDAO.ts"`

### Error Handling
- Services: Throw errors with descriptive messages
- Resources: Catch, log, return appropriate HTTP status
- DAOs: Let pg-promise errors bubble up

### Soft-Delete Pattern
```typescript
// DAO method
async trash(id: string, reason?: string): Promise<T> {
    const query = `
        UPDATE table_name
        SET deleted = NOW(), deleted_reason = $2
        WHERE id = $1 AND deleted IS NULL
        RETURNING *
    `;
    return await this.db.one(query, [id, reason || null]);
}
```

## Environment Configuration

### Secrets Management
- **Tool**: Doppler
- **Dev usage**: `doppler run -c dev --scope automator -- <command>`
- **Required vars**: `DB_HOST`, `DB_PORT`, `DB_DB`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, `LEAD_VENDOR_URL`, `LEAD_INTAKE_API_KEY`

### Environment-Aware Vendor Routing

```typescript
// In LeadService.sendLead()
if (process.env.NODE_ENV !== 'production') {
    // Route to vendorReceiveDAO (mock endpoint)
} else {
    // Route to iSpeedToLeadIAO (real vendor)
}
```

## Database Migrations

### Creating Migrations
```bash
npm run create-migration
# Generates: postgres/migrations/YYYYMMDDHHMMSS.do._description.sql
```

### Migration Rules
- **Naming**: Timestamp + `.do._` + snake_case description
- **Idempotency**: Use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
- **Rollback**: Create `.undo._` files for reversible changes
- **Order**: Chronological execution by timestamp

### Migration Pattern
```sql
-- Add column with DEFAULT to avoid NOT NULL issues
ALTER TABLE table_name ADD COLUMN new_col TYPE DEFAULT value;

-- Backfill data
UPDATE table_name SET new_col = <value> WHERE new_col IS NULL;

-- Add constraint after data populated
ALTER TABLE table_name ALTER COLUMN new_col SET NOT NULL;
```

## Testing Standards

**Current State**: No tests exist

**When adding tests** (future):
- Use Jest + ts-jest (already configured in package.json)
- Mock DAOs with `ts-mockito`
- Test service business logic (filters, workflows)
- Integration tests against test database

## Linting

- **Frontend**: Max 0 warnings (`npm run lint-fe`)
- **Backend**: Max 1000 warnings (`npm run lint-be`)
- **Fix before commit**: Run `npm run lint` to check both
