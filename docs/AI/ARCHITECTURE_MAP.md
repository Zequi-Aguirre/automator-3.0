# AskZack Architecture Map (v1)

This document provides a structured overview of the backend architecture for this workspace.

It does **not** replicate file content — instead, it maps each major directory and describes its role in the system.

---

## 🏗 Structure Overview

```
server/src/main/
├─ config/         → Environment setup, DB container, dependency injection
├─ controllers/    → One-off validation or utility controllers
├─ data/           → DAOs: database access and SQL operations
├─ middleware/     → Express middleware (auth, CSV parsing, token handling)
├─ resources/      → Express route definitions and HTTP layer
├─ services/       → Business logic and orchestration
├─ types/          → Domain type definitions and DTOs
├─ utils/          → Helper utilities (lead utils, etc.)
├─ vendor/         → Vendor-specific integration code
└─ worker/         → Background jobs and worker initialization
```

Each section below will document the key files, their responsibilities, and relationships to other layers.
The **config layer** is responsible for initializing environment variables, database connections, and global Express middleware.

### `envConfig.ts`
- Loads `.env` variables via **dotenv** and centralizes them in two classes:
  - `EnvConfig` → global app settings (environment, URLs, secrets).
  - `DBConfig` → PostgreSQL connection parameters (`host`, `port`, `user`, `password`, `database`).
- Acts as the **single source of truth** for all environment-dependent settings.

### `DBContainer.ts`
- Encapsulates PostgreSQL connection logic using **pg-promise**.
- Accepts a `DBConfig` and constructs connection parameters with safe defaults (timeouts, etc.).
- Provides a `database()` accessor returning an initialized `IDatabase` instance.
- Typically registered in the **dependency injection container** (`tsyringe`) so DAOs and services share a single database context.

### `index.ts`
- Exports a function `appConfig(app: Express)` that configures middleware globally:
  - **CORS** setup with dynamic allowed origins from `VITE_ALLOWED_ORIGINS`.
  - **Proxy trust** enabled for deployments behind reverse proxies.
  - **Logger** (Morgan `dev` mode), **JSON parsers**, **URL encoding**, and **cookie parsing**.
  - Exposes `New-Token` header for JWT refresh.

### 🌐 Combined Role in System Bootstrap
These files form the foundation of the backend runtime:

```
AutomatorServer.ts
   └─ appConfig(app)         ← index.ts
   └─ new EnvConfig()        ← envConfig.ts
   └─ new DBContainer(cfg)   ← DBContainer.ts
```

Collectively they:
- Load and validate environment variables.
- Initialize the PostgreSQL connection pool.
- Apply Express middleware and security rules.

Result → A fully configured runtime before domain logic or routes are mounted.

## 🔧 config/

---

## 🧱 middleware/

The middleware layer defines the cross-cutting logic for authentication, token management, and CSV-based data ingestion.

### `authenticator.ts`
- Injectable `Authenticator` class that validates and refreshes JWT tokens.
- Reads the `Authorization` header, verifies JWT signature, and attaches the user to `req.user`.
- Auto-renews tokens within 4 hours and adds a `New-Token` header for seamless session continuity.
- Performs role-based enforcement for admin routes.
- Integrates with `UserDAO` to validate user existence and role.

📦 **Role:** Central authentication middleware ensuring all secured endpoints operate under a verified user context.

---

### `parseCsvToCounties.ts`
- Parses raw CSV data into structured county objects `{ name, state, population, timezone }`.
- Cleans and normalizes header values and skips incomplete records.
- Supports admin-side bulk imports of county datasets.

📦 **Role:** Lightweight data normalization middleware for county imports.

---

### `parseCsvToLeads.ts`
- Handles complex CSV ingestion for **leads**, **affiliates**, **campaigns**, and **investors**.
- Splits, cleans, and transforms raw CSV rows into structured objects and entity mappings.
- Produces a composite result with sets/maps identifying interrelated entities.
- Serves as the main input parser for bulk lead ingestion workflows.

📦 **Role:** Data normalization middleware enabling scalable CSV import flows.

---

### `tokenGenerator.ts`
- Injectable `AuthUtils` class providing reusable JWT and password-hashing utilities.
- Functions: `generateToken()`, `verifyToken()`, `hashPassword()`, and `comparePassword()`.
- Uses **bcrypt** for secure password management and **jsonwebtoken** for token lifecycle handling.
- Used by authentication and user-related services.

📦 **Role:** Encapsulates authentication cryptography and lifecycle utilities for reuse across the stack.

---

### 🌐 Summary
The middleware layer provides:
- Centralized authentication and access control (Authenticator).
- Secure token generation and verification (AuthUtils).
- Clean CSV ingestion and validation pipelines for counties and leads.

Together, they form the security and ingestion backbone between client requests and core business logic.