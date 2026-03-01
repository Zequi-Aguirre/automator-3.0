# Lead Source API Authentication System - Implementation Tutorial

This document provides a complete guide to implementing the Lead Source API authentication system used in Northstar. This system allows external lead sources to submit leads via a secure REST API using Bearer token authentication.

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [API Key Generation & Storage](#api-key-generation--storage)
4. [Authentication Middleware](#authentication-middleware)
5. [Lead Intake API](#lead-intake-api)
6. [Admin UI - API Key Management](#admin-ui---api-key-management)
7. [Security Considerations](#security-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Integration Example](#integration-example)

---

## System Overview

### Architecture

```
External Lead Source
        ↓ (POST /integration-api/leads + Bearer token)
LeadSourceAuthenticator Middleware
        ↓ (validates token, attaches LeadSource to request)
Rate Limiter (600 leads/day per source)
        ↓
IntegrationLeadResource Handler
        ↓ (processes & stores lead with lead_source_id)
Database (leads table)
```

### Key Features

- **Bearer Token Authentication**: Uses 64-character cryptographically secure tokens
- **No Encryption in DB**: Tokens stored in plaintext (justified since they're high-entropy random values)
- **One-Time Token Display**: Tokens shown only once after generation
- **Rate Limiting**: 600 requests per day per lead source
- **Soft Deletion**: Deleted sources automatically excluded from auth
- **Product Association**: Each source tied to specific product (Sellers Direct, Compass, etc.)

---

## Database Schema

### Migration File

**File**: `postgres/migrations/20260115000001.do._add_lead_sources_table.sql`

```sql
-- Create the lead_sources table
CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    product VARCHAR(50) NOT NULL,  -- 'sellers direct', 'compass', 'clients direct'
    created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted TIMESTAMPTZ  -- Soft delete column
);

-- Unique constraint on token
ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_token_unique UNIQUE (token);

-- Index for fast token lookups (excluding soft-deleted records)
CREATE INDEX idx_lead_sources_token ON lead_sources(token)
    WHERE deleted IS NULL;

-- Index for lead-to-source joins
CREATE INDEX idx_leads_lead_source_id ON leads(lead_source_id)
    WHERE lead_source_id IS NOT NULL;

-- Auto-update modified timestamp trigger
CREATE OR REPLACE FUNCTION update_lead_sources_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lead_sources_modified
    BEFORE UPDATE ON lead_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_sources_modified();
```

### Add lead_source_id to leads table

```sql
-- Add foreign key to leads table
ALTER TABLE leads ADD COLUMN lead_source_id UUID;

ALTER TABLE leads
    ADD CONSTRAINT fk_leads_lead_source
    FOREIGN KEY (lead_source_id)
    REFERENCES lead_sources(id);
```

### Important Schema Notes

- **token**: 64 characters (32 bytes as hex string), stored in plaintext
- **deleted**: NULL means active, timestamp means soft-deleted
- **product**: Must match products from your product configuration
- **Indexes**: Optimize token lookups and lead-source joins

---

## API Key Generation & Storage

### TypeScript Types

**File**: `server/src/main/types/leadSourceTypes.ts`

```typescript
export interface LeadSource {
    id: string;
    token: string;
    email: string;
    name: string;
    product: Product;  // Your product enum/type
    created: Date;
    modified: Date;
    deleted: Date | null;
}
```

**File**: `common/types/leadSourceTypes.ts` (shared between client & server)

```typescript
// Request to create lead source (no token yet)
export type CreateLeadSourceRequest = {
    name: string;
    email: string;
    product: Product;
}

// Standard response (excludes token)
export type LeadSourceResponse = {
    id: string;
    email: string;
    name: string;
    product: Product;
    created: Date;
    modified: Date;
    deleted: Date | null;
}

// Response with token (only for creation/refresh)
export type CreateLeadSourceResponse = LeadSourceResponse & {
    token: string;
}

export type RefreshTokenResponse = {
    id: string;
    token: string;
}
```

### Token Generation Service

**File**: `server/src/main/services/leadSourceService.ts`

```typescript
import crypto from 'crypto';
import { injectable, inject } from 'inversify';
import { LeadSourceDAO } from '../data/leadSourceDAO';
import { LeadSource, CreateLeadSourceRequest } from '../types/leadSourceTypes';

@injectable()
export class LeadSourceService {
    constructor(
        @inject(LeadSourceDAO) private leadSourceDAO: LeadSourceDAO,
        @inject(Logger) private logger: Logger
    ) {}

    /**
     * Generates a cryptographically secure 64-character hex token
     */
    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex');  // 32 bytes = 64 hex chars
    }

    /**
     * Generates a unique token with collision detection
     * Retries up to 5 times if collision occurs
     */
    private async generateUniqueToken(): Promise<string> {
        const maxAttempts = 5;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const token = this.generateToken();
            const exists = await this.leadSourceDAO.tokenExists(token);

            if (!exists) {
                return token;
            }

            this.logger.warn('Token collision detected, retrying', {
                attempt: attempt + 1
            });
        }

        throw new Error('Failed to generate unique token after multiple attempts');
    }

    /**
     * Creates a new lead source with a unique token
     */
    async create(data: CreateLeadSourceRequest): Promise<LeadSource> {
        const token = await this.generateUniqueToken();

        const leadSource = await this.leadSourceDAO.create({
            ...data,
            token
        });

        this.logger.info('Created new lead source', {
            id: leadSource.id,
            email: leadSource.email
        });

        return leadSource;
    }

    /**
     * Refreshes token for existing lead source
     * WARNING: Old token becomes invalid immediately
     */
    async refreshToken(id: string): Promise<LeadSource> {
        const token = await this.generateUniqueToken();

        const leadSource = await this.leadSourceDAO.update(id, { token });

        this.logger.info('Refreshed token for lead source', {
            id: leadSource.id
        });

        return leadSource;
    }
}
```

### Data Access Layer

**File**: `server/src/main/data/leadSourceDAO.ts`

```typescript
import { injectable, inject } from 'inversify';
import { Database } from './database';
import { LeadSource } from '../types/leadSourceTypes';

@injectable()
export class LeadSourceDAO {
    constructor(
        @inject(Database) private db: Database
    ) {}

    /**
     * Checks if token already exists in database
     */
    async tokenExists(token: string): Promise<boolean> {
        const query = `
            SELECT EXISTS(
                SELECT 1
                FROM lead_sources
                WHERE token = $[token]
            ) as exists;
        `;

        const result = await this.db.database().one<{ exists: boolean }>(
            query,
            { token }
        );

        return result.exists;
    }

    /**
     * Creates a new lead source
     */
    async create(data: {
        name: string;
        email: string;
        product: string;
        token: string;
    }): Promise<LeadSource> {
        const query = `
            INSERT INTO lead_sources (name, email, product, token)
            VALUES ($[name], $[email], $[product], $[token])
            RETURNING *;
        `;

        return await this.db.database().one<LeadSource>(query, data);
    }

    /**
     * Updates lead source (used for token refresh and edits)
     */
    async update(id: string, data: Partial<LeadSource>): Promise<LeadSource> {
        const query = `
            UPDATE lead_sources
            SET
                name = COALESCE($[name], name),
                email = COALESCE($[email], email),
                product = COALESCE($[product], product),
                token = COALESCE($[token], token)
            WHERE id = $[id]
                AND deleted IS NULL
            RETURNING *;
        `;

        return await this.db.database().one<LeadSource>(query, { id, ...data });
    }

    /**
     * Retrieves lead source by token (for authentication)
     * Excludes soft-deleted sources
     */
    async getByToken(token: string): Promise<LeadSource | null> {
        const query = `
            SELECT *
            FROM lead_sources
            WHERE token = $[token]
                AND deleted IS NULL
            LIMIT 1;
        `;

        return await this.db.database().oneOrNone<LeadSource>(query, { token });
    }
}
```

### Key Implementation Notes

1. **Token Format**: 64-character hexadecimal string (32 random bytes)
2. **Algorithm**: Node.js `crypto.randomBytes()` - cryptographically secure
3. **Uniqueness**: Database check before saving, with retry logic
4. **Storage**: Plaintext in database (no encryption/hashing)
   - **Justification**: High-entropy random tokens (256 bits) are effectively unguessable
   - Hashing would prevent token validation, encryption adds complexity without security benefit
5. **Collision Handling**: Up to 5 retry attempts (extremely unlikely to ever collide)

---

## Authentication Middleware

### Middleware Implementation

**File**: `server/src/main/middleware/leadSourceAuthenticator.ts`

```typescript
import { injectable, inject } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { LeadSourceDAO } from '../data/leadSourceDAO';
import { LeadSource } from '../types/leadSourceTypes';
import { Logger } from '../logger';

// Extend Express Request type to include leadSource
declare global {
    namespace Express {
        interface Request {
            leadSource?: LeadSource;
        }
    }
}

@injectable()
export class LeadSourceAuthenticator {
    constructor(
        @inject(LeadSourceDAO) private leadSourceDAO: LeadSourceDAO,
        @inject(Logger) private logger: Logger
    ) {}

    /**
     * Express middleware that validates Bearer token and attaches lead source to request
     */
    authenticate() {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Extract Bearer token from Authorization header
                const token = this.extractBearerToken(req);

                if (!token) {
                    this.logger.warn('Lead source authentication failed: no token provided', {
                        path: req.path,
                        ip: req.ip
                    });

                    res.status(401).json({
                        error: 'Authorization required',
                        message: 'Please provide Authorization header with Bearer token'
                    });
                    return;
                }

                // Validate token against database
                const leadSource = await this.leadSourceDAO.getByToken(token);

                if (!leadSource) {
                    this.logger.warn('Lead source authentication failed: invalid token', {
                        path: req.path,
                        ip: req.ip,
                        tokenPrefix: token.substring(0, 8) + '...'  // Log prefix for debugging
                    });

                    res.status(401).json({
                        error: 'Invalid token',
                        message: 'The provided Bearer token is not valid or has been revoked'
                    });
                    return;
                }

                // Attach authenticated lead source to request
                req.leadSource = leadSource;

                this.logger.info('Lead source authenticated', {
                    leadSourceId: leadSource.id,
                    leadSourceName: leadSource.name,
                    path: req.path
                });

                next();

            } catch (error) {
                this.logger.error('Error during lead source authentication', {
                    error,
                    path: req.path
                });

                res.status(500).json({
                    error: 'Authentication error',
                    message: 'An error occurred during authentication'
                });
            }
        };
    }

    /**
     * Extracts Bearer token from Authorization header
     * Expected format: "Bearer <token>"
     */
    private extractBearerToken(req: Request): string | null {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return null;
        }

        // Handle array (shouldn't happen but defensive)
        const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

        // Split "Bearer <token>"
        const parts = authValue.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        return parts[1];  // Return the token part
    }
}
```

### Usage in Express Routes

**File**: `server/src/main/resources/integrationLeadResource.ts`

```typescript
import { Router } from 'express';
import { injectable, inject } from 'inversify';
import { LeadSourceAuthenticator } from '../middleware/leadSourceAuthenticator';
import { IntegrationLeadService } from '../services/integrationLeadService';

@injectable()
export class IntegrationLeadResource {
    constructor(
        @inject(LeadSourceAuthenticator) private authenticator: LeadSourceAuthenticator,
        @inject(IntegrationLeadService) private integrationLeadService: IntegrationLeadService
    ) {}

    routes(): Router {
        const router = Router();

        // Apply authentication middleware to all routes
        router.use(this.authenticator.authenticate());

        // Protected endpoint - requires valid Bearer token
        router.post('/leads', async (req, res) => {
            // req.leadSource is now available (attached by middleware)
            const result = await this.integrationLeadService.processLead(
                req.body,
                req.leadSource!  // Non-null assertion safe because middleware guarantees it
            );

            res.status(200).json(result);
        });

        return router;
    }
}
```

### Request Flow

```
1. Client sends request:
   POST /integration-api/leads
   Authorization: Bearer abc123def456...

2. LeadSourceAuthenticator.authenticate() middleware:
   - Extracts token from header
   - Queries database: SELECT * FROM lead_sources WHERE token = ? AND deleted IS NULL
   - If not found → 401 Unauthorized
   - If found → Attaches LeadSource object to req.leadSource

3. Rate limiter (next middleware):
   - Checks request count for req.leadSource.id
   - If over limit → 429 Too Many Requests

4. Route handler:
   - Accesses req.leadSource
   - Processes lead with lead_source_id = req.leadSource.id
```

---

## Lead Intake API

### Request Schema Validation

**File**: `server/src/main/types/integrationLeadTypes.ts`

```typescript
import { z } from 'zod';

export const IntegrationLeadSingleRequestSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().min(1, 'Email is required').email('Email must be valid'),
    phone: z.string().min(1, 'Phone is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zip_code: z.string().min(1, 'Zip code is required'),
    county: z.string().min(1, 'County is required'),
    private_note: z.string().optional(),
    buyer_note: z.string().optional(),
    realEstate: z.boolean().optional().default(false),
});

export type IntegrationLeadSingleRequest = z.infer<typeof IntegrationLeadSingleRequestSchema>;
```

### Rate Limiting Configuration

**File**: `server/src/main/resources/integrationLeadResource.ts`

```typescript
import rateLimit from 'express-rate-limit';

@injectable()
export class IntegrationLeadResource {
    // ...

    /**
     * Creates rate limiter for lead submissions
     * Limit: 600 requests per 24 hours per lead source
     */
    private createRateLimiter() {
        return rateLimit({
            windowMs: 24 * 60 * 60 * 1000,  // 24 hours in milliseconds
            max: 600,  // Maximum 600 requests per window
            skipFailedRequests: true,  // Only count successful (2xx) responses

            // Key by lead source ID (not IP address)
            keyGenerator: (req: Request) => {
                return req.leadSource?.id || 'unknown';
            },

            // Custom error message
            handler: (req, res) => {
                res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: 'You have exceeded the limit of 600 leads per 24 hours'
                });
            },

            // Standard headers
            standardHeaders: true,
            legacyHeaders: false,
        });
    }

    routes(): Router {
        const router = Router();

        // Apply authentication first
        router.use(this.authenticator.authenticate());

        // Then apply rate limiter (needs req.leadSource from authenticator)
        router.use(this.createRateLimiter());

        // Routes...
        return router;
    }
}
```

### Lead Processing Service

**File**: `server/src/main/services/integrationLeadService.ts`

```typescript
import { injectable, inject } from 'inversify';
import { LeadDAO } from '../data/leadDAO';
import { LeadSource } from '../types/leadSourceTypes';
import { IntegrationLeadSingleRequest } from '../types/integrationLeadTypes';
import { CountyDAO } from '../data/countyDAO';
import { CategoryDAO } from '../data/categoryDAO';

@injectable()
export class IntegrationLeadService {
    constructor(
        @inject(LeadDAO) private leadDAO: LeadDAO,
        @inject(CountyDAO) private countyDAO: CountyDAO,
        @inject(CategoryDAO) private categoryDAO: CategoryDAO,
        @inject(Logger) private logger: Logger
    ) {}

    async processLead(
        data: IntegrationLeadSingleRequest,
        leadSource: LeadSource
    ): Promise<{ status: string; error?: string }> {
        try {
            // 1. Determine category based on realEstate flag
            const categoryName = data.realEstate ? 'Real Estate' : 'Default Category';
            const category = await this.categoryDAO.getByName(categoryName);

            if (!category) {
                throw new Error(`Category not found: ${categoryName}`);
            }

            // 2. Lookup county by name
            const county = await this.countyDAO.getByName(data.county);

            if (!county) {
                return {
                    status: 'validation_error',
                    error: `Invalid county: ${data.county}`
                };
            }

            // 3. Check for duplicate (by email or phone)
            const duplicate = await this.leadDAO.findDuplicate(
                data.email,
                data.phone
            );

            if (duplicate) {
                this.logger.info('Duplicate lead detected', {
                    email: data.email,
                    leadSourceId: leadSource.id
                });

                return {
                    status: 'duplicate',
                    error: 'Lead with this email or phone already exists'
                };
            }

            // 4. Create lead record
            const lead = await this.leadDAO.create({
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                city: data.city,
                state: data.state,
                zip_code: data.zip_code,
                county_id: county.id,
                category_id: category.id,
                lead_source_id: leadSource.id,  // Associate with authenticated source
                uploaded_by_user_id: null,  // Integration leads have no user uploader
                verified: this.requiresVerification(leadSource.product) ? false : true,
                private_note: data.private_note || null,
                buyer_note: data.buyer_note || null,
            });

            // 5. Create activity record (optional, for audit trail)
            await this.createLeadActivity(lead.id, leadSource);

            this.logger.info('Lead created via integration API', {
                leadId: lead.id,
                leadSourceId: leadSource.id,
                county: data.county,
                category: categoryName
            });

            return { status: 'success' };

        } catch (error) {
            this.logger.error('Error processing integration lead', {
                error,
                leadSourceId: leadSource.id,
                data
            });

            throw error;
        }
    }

    /**
     * Determines if leads from this product require manual verification
     */
    private requiresVerification(product: string): boolean {
        // Example logic - adjust based on your business rules
        return product === 'sellers direct';
    }

    /**
     * Creates activity record for lead submission
     */
    private async createLeadActivity(leadId: string, leadSource: LeadSource): Promise<void> {
        // Implementation depends on your activity tracking system
        // Example: log that lead was submitted via API by specific source
    }
}
```

### Route Handler with Validation

**File**: `server/src/main/resources/integrationLeadResource.ts`

```typescript
routes(): Router {
    const router = Router();

    router.use(this.authenticator.authenticate());
    router.use(this.createRateLimiter());

    router.post('/leads', async (req, res, next) => {
        try {
            // Validate request body against schema
            const parseResult = IntegrationLeadSingleRequestSchema.safeParse(req.body);

            if (!parseResult.success) {
                res.status(400).json({
                    error: 'Validation error',
                    message: 'Invalid lead data',
                    details: parseResult.error.errors
                });
                return;
            }

            // Process validated lead
            const result = await this.integrationLeadService.processLead(
                parseResult.data,
                req.leadSource!
            );

            // Handle different result statuses
            if (result.status === 'duplicate') {
                res.status(409).json(result);
                return;
            }

            if (result.status === 'validation_error') {
                res.status(400).json(result);
                return;
            }

            // Success - return 200 with empty body (or success message)
            res.status(200).json(result);

        } catch (error) {
            next(error);  // Pass to error handling middleware
        }
    });

    return router;
}
```

---

## Admin UI - API Key Management

### Backend Admin API

**File**: `server/src/main/resources/leadSourceResource.ts`

```typescript
import { Router } from 'express';
import { injectable, inject } from 'inversify';
import { hasPermission } from '../util/permissions';
import { PermissionsNameEnum } from '../types/permissions';
import { LeadSourceService } from '../services/leadSourceService';

@injectable()
export class LeadSourceResource {
    constructor(
        @inject(LeadSourceService) private leadSourceService: LeadSourceService
    ) {}

    routes(): Router {
        const router = Router();

        // All admin routes require authentication and UPLOAD permission
        router.use(this.requireUploadPermission);

        // List all lead sources (excludes token field)
        router.get('/admin', async (req, res) => {
            const leadSources = await this.leadSourceService.getAll();

            // Map to response type (excludes token)
            const response = leadSources.map(ls => ({
                id: ls.id,
                name: ls.name,
                email: ls.email,
                product: ls.product,
                created: ls.created,
                modified: ls.modified,
                deleted: ls.deleted
            }));

            res.json(response);
        });

        // Get single lead source (excludes token)
        router.get('/admin/:id', async (req, res) => {
            const leadSource = await this.leadSourceService.getById(req.params.id);

            if (!leadSource) {
                res.status(404).json({ error: 'Lead source not found' });
                return;
            }

            res.json({
                id: leadSource.id,
                name: leadSource.name,
                email: leadSource.email,
                product: leadSource.product,
                created: leadSource.created,
                modified: leadSource.modified,
                deleted: leadSource.deleted
            });
        });

        // Create new lead source (returns token once)
        router.post('/admin', async (req, res) => {
            const { name, email, product } = req.body;

            const leadSource = await this.leadSourceService.create({
                name,
                email,
                product
            });

            // Return full object including token (one-time display)
            res.status(201).json({
                id: leadSource.id,
                name: leadSource.name,
                email: leadSource.email,
                product: leadSource.product,
                created: leadSource.created,
                modified: leadSource.modified,
                deleted: leadSource.deleted,
                token: leadSource.token  // ONLY TIME TOKEN IS RETURNED
            });
        });

        // Update lead source (name, email, product only - not token)
        router.put('/admin/:id', async (req, res) => {
            const { name, email, product } = req.body;

            const leadSource = await this.leadSourceService.update(req.params.id, {
                name,
                email,
                product
            });

            res.json({
                id: leadSource.id,
                name: leadSource.name,
                email: leadSource.email,
                product: leadSource.product,
                created: leadSource.created,
                modified: leadSource.modified,
                deleted: leadSource.deleted
            });
        });

        // Refresh token (generates new token, invalidates old one)
        router.post('/admin/:id/refresh-token', async (req, res) => {
            const leadSource = await this.leadSourceService.refreshToken(req.params.id);

            // Return only ID and new token
            res.json({
                id: leadSource.id,
                token: leadSource.token  // New token returned once
            });
        });

        // Soft delete lead source
        router.delete('/admin/:id', async (req, res) => {
            await this.leadSourceService.delete(req.params.id);
            res.status(204).send();
        });

        return router;
    }

    /**
     * Middleware that checks for UPLOAD permission
     */
    private requireUploadPermission = (req, res, next) => {
        if (!hasPermission({
            requiredPermission: PermissionsNameEnum.UPLOAD,
            userPermissions: req.user.permissions
        })) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        next();
    };
}
```

### Frontend Service

**File**: `client/src/services/leadSource.service.tsx`

```typescript
import axios from 'axios';
import {
    LeadSourceResponse,
    CreateLeadSourceRequest,
    CreateLeadSourceResponse,
    UpdateLeadSourceRequest,
    RefreshTokenResponse
} from '@common/types/leadSourceTypes';

class LeadSourceService {
    private baseUrl = '/api/lead-sources/admin';

    /**
     * Get all lead sources (no tokens)
     */
    async getAll(): Promise<LeadSourceResponse[]> {
        const response = await axios.get(this.baseUrl);
        return response.data;
    }

    /**
     * Get single lead source by ID (no token)
     */
    async getById(id: string): Promise<LeadSourceResponse> {
        const response = await axios.get(`${this.baseUrl}/${id}`);
        return response.data;
    }

    /**
     * Create new lead source (returns token once)
     */
    async create(data: CreateLeadSourceRequest): Promise<CreateLeadSourceResponse> {
        const response = await axios.post(this.baseUrl, data);
        return response.data;
    }

    /**
     * Update lead source (name, email, product)
     */
    async update(id: string, data: UpdateLeadSourceRequest): Promise<LeadSourceResponse> {
        const response = await axios.put(`${this.baseUrl}/${id}`, data);
        return response.data;
    }

    /**
     * Refresh API token (returns new token once)
     */
    async refreshToken(id: string): Promise<RefreshTokenResponse> {
        const response = await axios.post(`${this.baseUrl}/${id}/refresh-token`);
        return response.data;
    }

    /**
     * Soft delete lead source
     */
    async delete(id: string): Promise<void> {
        await axios.delete(`${this.baseUrl}/${id}`);
    }
}

export default new LeadSourceService();
```

### Main View Component

**File**: `client/src/views/LeadSourcesView.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Button, Table } from '@mui/material';
import leadSourceService from '../services/leadSource.service';
import { LeadSourceResponse } from '@common/types/leadSourceTypes';
import CreateLeadSourceDialog from '../components/leadSourceComponents/CreateLeadSourceDialog';
import TokenDisplayDialog from '../components/leadSourceComponents/TokenDisplayDialog';
import RefreshTokenDialog from '../components/leadSourceComponents/RefreshTokenDialog';

export const LeadSourcesView: React.FC = () => {
    const [leadSources, setLeadSources] = useState<LeadSourceResponse[]>([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [tokenDisplayOpen, setTokenDisplayOpen] = useState(false);
    const [currentToken, setCurrentToken] = useState<string>('');

    useEffect(() => {
        loadLeadSources();
    }, []);

    const loadLeadSources = async () => {
        const sources = await leadSourceService.getAll();
        setLeadSources(sources);
    };

    const handleCreate = async (data: CreateLeadSourceRequest) => {
        const newSource = await leadSourceService.create(data);

        // Show token immediately (one-time display)
        setCurrentToken(newSource.token);
        setTokenDisplayOpen(true);
        setCreateDialogOpen(false);

        // Reload list
        loadLeadSources();
    };

    const handleRefreshToken = async (id: string) => {
        const result = await leadSourceService.refreshToken(id);

        // Show new token (one-time display)
        setCurrentToken(result.token);
        setTokenDisplayOpen(true);

        // No need to reload list (token not shown in table)
    };

    return (
        <div>
            <h1>Lead Sources</h1>

            <Button onClick={() => setCreateDialogOpen(true)}>
                Create Lead Source
            </Button>

            <Table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Product</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {leadSources.map(source => (
                        <tr key={source.id}>
                            <td>{source.name}</td>
                            <td>{source.email}</td>
                            <td>{source.product}</td>
                            <td>{new Date(source.created).toLocaleDateString()}</td>
                            <td>
                                <Button onClick={() => handleRefreshToken(source.id)}>
                                    Refresh Token
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <CreateLeadSourceDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onCreate={handleCreate}
            />

            <TokenDisplayDialog
                open={tokenDisplayOpen}
                token={currentToken}
                onClose={() => {
                    setTokenDisplayOpen(false);
                    setCurrentToken('');  // Clear token from memory
                }}
            />
        </div>
    );
};
```

### Token Display Dialog

**File**: `client/src/components/leadSourceComponents/TokenDisplayDialog.tsx`

```typescript
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    IconButton,
    Tooltip
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';

interface TokenDisplayDialogProps {
    open: boolean;
    token: string;
    onClose: () => void;
}

export const TokenDisplayDialog: React.FC<TokenDisplayDialogProps> = ({
    open,
    token,
    onClose
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(token);
        setCopied(true);

        // Reset copied state after 2 seconds
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                API Token Generated
            </DialogTitle>

            <DialogContent>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    This token will only be shown once. Please copy it now and store it securely.
                </Alert>

                <TextField
                    fullWidth
                    value={token}
                    label="API Token"
                    variant="outlined"
                    InputProps={{
                        readOnly: true,
                        endAdornment: (
                            <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                                <IconButton onClick={handleCopy} edge="end">
                                    <CopyIcon color={copied ? 'success' : 'primary'} />
                                </IconButton>
                            </Tooltip>
                        )
                    }}
                    sx={{ mb: 2 }}
                />

                <Alert severity="info">
                    <strong>How to use:</strong> Include this token in the Authorization header
                    of all API requests:
                    <pre style={{ marginTop: 8, background: '#f5f5f5', padding: 8 }}>
                        Authorization: Bearer {token}
                    </pre>
                </Alert>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="contained">
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TokenDisplayDialog;
```

### Create Dialog

**File**: `client/src/components/leadSourceComponents/CreateLeadSourceDialog.tsx`

```typescript
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem
} from '@mui/material';
import { CreateLeadSourceRequest } from '@common/types/leadSourceTypes';

interface CreateLeadSourceDialogProps {
    open: boolean;
    onClose: () => void;
    onCreate: (data: CreateLeadSourceRequest) => void;
}

export const CreateLeadSourceDialog: React.FC<CreateLeadSourceDialogProps> = ({
    open,
    onClose,
    onCreate
}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [product, setProduct] = useState('');

    const handleSubmit = () => {
        onCreate({ name, email, product });

        // Reset form
        setName('');
        setEmail('');
        setProduct('');
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create Lead Source</DialogTitle>

            <DialogContent>
                <TextField
                    fullWidth
                    label="Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    margin="normal"
                    required
                />

                <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    margin="normal"
                    required
                />

                <TextField
                    fullWidth
                    select
                    label="Product"
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                    margin="normal"
                    required
                >
                    <MenuItem value="sellers direct">Sellers Direct</MenuItem>
                    <MenuItem value="compass">Compass</MenuItem>
                    <MenuItem value="clients direct">Clients Direct</MenuItem>
                </TextField>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={!name || !email || !product}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateLeadSourceDialog;
```

---

## Security Considerations

### 1. Token Storage

**Decision: Store tokens in plaintext (no hashing/encryption)**

**Justification:**
- Tokens are 64-character hex strings (32 random bytes = 256 bits of entropy)
- Cryptographically secure random generation makes brute-forcing infeasible
- Hashing would prevent validation (can't compare hashes with plaintext tokens)
- Encryption adds complexity without meaningful security benefit
- Industry standard: services like Stripe, GitHub also store API keys in plaintext

**Mitigations:**
- High-entropy generation (crypto.randomBytes)
- Unique constraint prevents duplicates
- One-time display forces immediate storage by client
- Soft deletion immediately invalidates tokens
- Rate limiting prevents abuse

### 2. Token Transmission

**Always use HTTPS in production:**
- Bearer tokens transmitted in Authorization header
- HTTPS encrypts all headers end-to-end
- Never log full tokens (use prefix only)
- Never include tokens in URLs (query params/paths)

### 3. Token Refresh

**Security flow:**
1. Admin must authenticate with user session
2. Requires UPLOAD permission
3. Old token invalidated immediately upon refresh
4. New token shown once (must be copied)
5. Integration must update immediately or lose access

### 4. Rate Limiting

**Protection against abuse:**
- 600 requests per 24 hours per lead source
- Keyed by lead source ID (not IP, since integrations may have dynamic IPs)
- Only counts successful requests (skipFailedRequests: true)
- Returns 429 status with clear error message

### 5. Soft Deletion

**Benefits:**
- Maintains referential integrity (leads table still links to deleted sources)
- Audit trail preserved
- Token immediately invalidated (WHERE deleted IS NULL)
- Can be "undeleted" if needed (set deleted = NULL)

### 6. Permission Boundaries

**Admin endpoints:**
- Require user authentication (session)
- Require UPLOAD permission
- Include `/admin` in path for proper routing

**Integration endpoints:**
- Use Bearer token authentication
- No user session required
- Limited to lead submission only

---

## Testing Strategy

### Unit Tests

**File**: `server/src/test/services/leadSourceService.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { LeadSourceService } from '../../main/services/leadSourceService';
import { LeadSourceDAO } from '../../main/data/leadSourceDAO';
import { instance, mock, when, verify, anything } from 'ts-mockito';

describe('LeadSourceService', () => {
    let service: LeadSourceService;
    let mockDAO: LeadSourceDAO;

    beforeEach(() => {
        mockDAO = mock(LeadSourceDAO);
        service = new LeadSourceService(instance(mockDAO));
    });

    describe('create', () => {
        it('should generate unique token and create lead source', async () => {
            // Mock token uniqueness check
            when(mockDAO.tokenExists(anything())).thenResolve(false);

            // Mock create
            when(mockDAO.create(anything())).thenResolve({
                id: 'test-id',
                token: 'abc123...',
                name: 'Test Source',
                email: 'test@example.com',
                product: 'sellers direct',
                created: new Date(),
                modified: new Date(),
                deleted: null
            });

            const result = await service.create({
                name: 'Test Source',
                email: 'test@example.com',
                product: 'sellers direct'
            });

            expect(result.token).toBeTruthy();
            expect(result.token.length).toBe(64);
            verify(mockDAO.tokenExists(anything())).once();
            verify(mockDAO.create(anything())).once();
        });

        it('should retry on token collision', async () => {
            // First token collides, second succeeds
            when(mockDAO.tokenExists(anything()))
                .thenResolve(true)
                .thenResolve(false);

            when(mockDAO.create(anything())).thenResolve(/* ... */);

            await service.create({
                name: 'Test Source',
                email: 'test@example.com',
                product: 'sellers direct'
            });

            // Should have checked twice
            verify(mockDAO.tokenExists(anything())).twice();
        });
    });
});
```

### Integration Tests

**File**: `server/src/test/routes/integrationLeadResource.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../main/app';
import { TestDBSetup } from '../helpers/TestDBSetup';

describe('Integration Lead API', () => {
    let testToken: string;

    beforeAll(async () => {
        await TestDBSetup.setup();

        // Create test lead source and get token
        const leadSource = await TestDBSetup.createLeadSource({
            name: 'Test Integration',
            email: 'test@example.com',
            product: 'sellers direct'
        });

        testToken = leadSource.token;
    });

    afterAll(async () => {
        await TestDBSetup.teardown();
    });

    describe('POST /integration-api/leads', () => {
        it('should reject request without authorization header', async () => {
            const response = await request(app)
                .post('/integration-api/leads')
                .send({ name: 'Test Lead' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authorization required');
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .post('/integration-api/leads')
                .set('Authorization', 'Bearer invalid-token')
                .send({ name: 'Test Lead' });

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Invalid token');
        });

        it('should accept valid lead with valid token', async () => {
            const response = await request(app)
                .post('/integration-api/leads')
                .set('Authorization', `Bearer ${testToken}`)
                .send({
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '555-1234',
                    address: '123 Main St',
                    city: 'Miami',
                    state: 'FL',
                    zip_code: '33101',
                    county: 'MIAMI-DADE',
                    realEstate: true
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });

        it('should enforce rate limit', async () => {
            // Submit 601 leads (over limit of 600)
            for (let i = 0; i < 601; i++) {
                const response = await request(app)
                    .post('/integration-api/leads')
                    .set('Authorization', `Bearer ${testToken}`)
                    .send({
                        name: `Lead ${i}`,
                        email: `lead${i}@example.com`,
                        phone: `555-${i}`,
                        address: '123 Main St',
                        city: 'Miami',
                        state: 'FL',
                        zip_code: '33101',
                        county: 'MIAMI-DADE'
                    });

                if (i < 600) {
                    expect(response.status).toBe(200);
                } else {
                    expect(response.status).toBe(429);
                    expect(response.body.error).toBe('Rate limit exceeded');
                }
            }
        });
    });
});
```

---

## Integration Example

### External Client Integration

```bash
# Create .env file with token
echo "NORTHSTAR_API_TOKEN=your-64-char-token-here" > .env

# Python example
import os
import requests

API_URL = "https://api.northstar.com/integration-api/leads"
API_TOKEN = os.getenv("NORTHSTAR_API_TOKEN")

def submit_lead(lead_data):
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=lead_data, headers=headers)

    if response.status_code == 200:
        print("Lead submitted successfully")
    elif response.status_code == 401:
        print("Authentication failed - check your token")
    elif response.status_code == 429:
        print("Rate limit exceeded - try again tomorrow")
    else:
        print(f"Error: {response.status_code} - {response.json()}")

# Example lead
lead = {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "555-9876",
    "address": "456 Oak Ave",
    "city": "Tampa",
    "state": "FL",
    "zip_code": "33602",
    "county": "HILLSBOROUGH",
    "private_note": "Called twice, very interested",
    "realEstate": True
}

submit_lead(lead)
```

### Node.js/TypeScript Example

```typescript
import axios from 'axios';

const API_URL = 'https://api.northstar.com/integration-api/leads';
const API_TOKEN = process.env.NORTHSTAR_API_TOKEN!;

interface LeadData {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    county: string;
    private_note?: string;
    buyer_note?: string;
    realEstate?: boolean;
}

async function submitLead(lead: LeadData): Promise<void> {
    try {
        const response = await axios.post(API_URL, lead, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Lead submitted successfully');

    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                console.error('Authentication failed - check your token');
            } else if (error.response?.status === 429) {
                console.error('Rate limit exceeded - try again tomorrow');
            } else if (error.response?.status === 400) {
                console.error('Validation error:', error.response.data);
            } else {
                console.error('Unexpected error:', error.response?.data);
            }
        } else {
            console.error('Network error:', error);
        }
    }
}

// Submit lead
submitLead({
    name: 'Bob Johnson',
    email: 'bob@example.com',
    phone: '555-4321',
    address: '789 Pine St',
    city: 'Orlando',
    state: 'FL',
    zip_code: '32801',
    county: 'ORANGE',
    realEstate: false
});
```

---

## Summary Checklist

When implementing this system in a new codebase:

- [ ] **Database**
  - [ ] Create lead_sources table with token, email, name, product, deleted columns
  - [ ] Add lead_source_id FK to leads table
  - [ ] Create indexes on token (WHERE deleted IS NULL) and lead_source_id
  - [ ] Add auto-update trigger for modified timestamp

- [ ] **Backend Types**
  - [ ] Define LeadSource interface (server)
  - [ ] Define request/response types (shared common folder)
  - [ ] Define integration lead request schema (Zod)

- [ ] **Token Generation**
  - [ ] Implement generateToken() using crypto.randomBytes(32).toString('hex')
  - [ ] Implement generateUniqueToken() with collision retry logic
  - [ ] Create LeadSourceService with create() and refreshToken() methods
  - [ ] Create LeadSourceDAO with tokenExists() and getByToken() queries

- [ ] **Authentication**
  - [ ] Create LeadSourceAuthenticator middleware
  - [ ] Implement extractBearerToken() method
  - [ ] Add req.leadSource to Express Request type
  - [ ] Return 401 for missing/invalid tokens

- [ ] **Lead Intake**
  - [ ] Create IntegrationLeadResource with /leads endpoint
  - [ ] Apply authenticator middleware
  - [ ] Add rate limiter (keyed by lead source ID)
  - [ ] Validate request body with Zod schema
  - [ ] Process leads with lead_source_id from req.leadSource

- [ ] **Admin API**
  - [ ] Create LeadSourceResource with CRUD endpoints under /admin path
  - [ ] Require user authentication + UPLOAD permission
  - [ ] Exclude token from list/get responses
  - [ ] Include token ONLY in create and refresh-token responses

- [ ] **Admin UI**
  - [ ] Create LeadSourceService (client)
  - [ ] Build LeadSourcesView with table of sources
  - [ ] Build CreateLeadSourceDialog with form
  - [ ] Build TokenDisplayDialog with copy-to-clipboard
  - [ ] Build RefreshTokenDialog with warning
  - [ ] Show token only once after creation/refresh

- [ ] **Testing**
  - [ ] Unit tests for token generation (uniqueness, collision handling)
  - [ ] Integration tests for authentication (401 scenarios)
  - [ ] Integration tests for lead submission (valid/invalid/duplicate)
  - [ ] Integration tests for rate limiting
  - [ ] Integration tests for admin CRUD operations

- [ ] **Documentation**
  - [ ] API documentation for integration partners
  - [ ] Admin user guide for token management
  - [ ] Security notes about token storage

---

## Conclusion

This system provides a secure, scalable way to accept leads from external sources via REST API. Key design decisions:

1. **Simple but secure**: 256-bit random tokens provide sufficient security without complex encryption
2. **One-time display**: Forces clients to store tokens securely
3. **Rate limiting**: Prevents abuse while allowing reasonable daily volume
4. **Soft deletion**: Maintains data integrity and audit trail
5. **Product association**: Allows business logic based on lead source type

The system balances security, usability, and maintainability, making it straightforward to implement and operate.
