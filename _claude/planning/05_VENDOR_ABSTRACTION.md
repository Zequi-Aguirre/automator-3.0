# Vendor Abstraction Redesign

## Current State

**File**: `server/src/main/vendor/iSpeedToLeadIAO.ts`

**Problems**:
- ❌ Hardcoded to single vendor (iSpeedToLead)
- ❌ URL from environment variable (`LEAD_VENDOR_URL`)
- ❌ No authentication abstraction
- ❌ Cannot support multiple vendors

**Current Code**:
```typescript
export default class ISpeedToLeadIAO {
    private readonly url: string;

    constructor(private readonly config: EnvConfig) {
        this.url = this.config.leadVendorURL;  // From env
    }

    async sendLead(payload: ISpeedToLeadPayload): Promise<AxiosResponse> {
        return await axios.post(this.url, payload, {
            timeout: 15000,
            headers: { "Content-Type": "application/json" }
        });
    }
}
```

---

## New Abstraction

**File**: `server/src/main/vendor/buyerWebhookAdapter.ts`

**Purpose**: Generic HTTP client for any buyer webhook with flexible authentication

---

## 1. BuyerWebhookAdapter Implementation

```typescript
import axios, { AxiosResponse } from "axios";
import { injectable } from "tsyringe";

export type BuyerWebhookPayload = Record<string, any>;

export type BuyerAuthConfig = {
    auth_type: 'bearer' | 'api_key' | 'custom' | 'none';
    auth_token?: string;
    auth_header_name?: string;  // For custom auth (e.g., "X-Custom-Token")
    auth_header_prefix?: string;  // For custom auth (e.g., "Token" or "ApiKey")
};

@injectable()
export default class BuyerWebhookAdapter {

    /**
     * Send lead payload to buyer's webhook URL
     *
     * @param webhookUrl - Full URL of buyer's webhook
     * @param payload - Lead data (merged from lead + lead_form_inputs)
     * @param authConfig - Authentication configuration
     * @returns Axios response
     */
    async sendToBuyer(
        webhookUrl: string,
        payload: BuyerWebhookPayload,
        authConfig: BuyerAuthConfig
    ): Promise<AxiosResponse> {

        const headers = this.buildHeaders(authConfig);

        // Strip null/undefined/empty values from payload
        const cleanPayload = this.stripNulls(payload);

        try {
            return await axios.post(webhookUrl, cleanPayload, {
                timeout: 15000,  // 15 seconds
                headers
            });
        } catch (err: any) {
            // Preserve axios error details for logging
            if (err.response) {
                throw new Error(
                    `Buyer webhook failed [${err.response.status}]: ${JSON.stringify(err.response.data)}`
                );
            }
            throw new Error(`Buyer webhook failed: ${err.message || "Unknown error"}`);
        }
    }

    /**
     * Build HTTP headers based on auth configuration
     */
    private buildHeaders(authConfig: BuyerAuthConfig): Record<string, string> {
        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };

        switch (authConfig.auth_type) {
            case 'bearer':
                if (authConfig.auth_token) {
                    headers['Authorization'] = `Bearer ${authConfig.auth_token}`;
                }
                break;

            case 'api_key':
                if (authConfig.auth_token) {
                    // Standard API key header
                    headers['X-API-Key'] = authConfig.auth_token;
                }
                break;

            case 'custom':
                // Flexible custom header configuration
                if (authConfig.auth_token && authConfig.auth_header_name) {
                    const prefix = authConfig.auth_header_prefix || '';
                    const headerValue = prefix
                        ? `${prefix} ${authConfig.auth_token}`
                        : authConfig.auth_token;
                    headers[authConfig.auth_header_name] = headerValue;
                }
                break;

            case 'none':
            default:
                // No authentication headers
                break;
        }

        return headers;
    }

    /**
     * Remove null, undefined, and empty string values from payload
     */
    private stripNulls(obj: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => {
                if (v === null || v === undefined) return false;
                if (typeof v === "string" && v.trim() === "") return false;
                return true;
            })
        );
    }
}
```

---

## 2. Authentication Types

### 2.1 Bearer Token (`auth_type: 'bearer'`)

**Use Case**: OAuth-style authentication, JWT tokens

**Header**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Database** (auth_token_encrypted stored, decrypted by application):
```sql
-- Store encrypted token (encrypted at application level)
INSERT INTO buyers (name, webhook_url, auth_type, auth_token_encrypted)
VALUES (
    'Compass',
    'https://api.compass.com/leads',
    'bearer',
    '<encrypted_value>'  -- Encrypted by application before INSERT
);
```

---

### 2.2 API Key (`auth_type: 'api_key'`)

**Use Case**: Simple API key authentication

**Header**:
```http
X-API-Key: abc123def456
```

**Database**:
```sql
INSERT INTO buyers (name, webhook_url, auth_type, auth_token_encrypted)
VALUES (
    'Pickle',
    'https://pickle.io/webhook/leads',
    'api_key',
    '<encrypted_value>'
);
```

---

### 2.3 Custom (`auth_type: 'custom'`)

**Use Case**: Flexible header configuration for non-standard auth

**Headers**:
```http
X-Custom-Auth: Token abc123def456
```

**Database**:
```sql
INSERT INTO buyers (
    name, webhook_url, auth_type,
    auth_header_name, auth_header_prefix, auth_token_encrypted
)
VALUES (
    'CustomBuyer',
    'https://custom.com/leads',
    'custom',
    'X-Custom-Auth',  -- Header name
    'Token',  -- Optional prefix
    '<encrypted_value>'  -- The actual token
);
```

**Example Configurations**:
- `auth_header_name: "X-API-Token"`, `auth_header_prefix: NULL` → `X-API-Token: abc123`
- `auth_header_name: "Authorization"`, `auth_header_prefix: "ApiKey"` → `Authorization: ApiKey abc123`

---

### 2.4 None (`auth_type: 'none'`)

**Use Case**: Public webhooks, no authentication required

**Headers**: Only `Content-Type: application/json`

**Database**:
```sql
INSERT INTO buyers (name, webhook_url, auth_type, auth_token_encrypted)
VALUES (
    'iSpeedToLead',
    'https://webhook.ispeedtolead.com/leads',
    'none',
    NULL
);
```

---

## 3. Environment-Aware Routing

**Goal**: In non-production, route to mock endpoint instead of real vendor

**Implementation** (in `BuyerDispatchService`):

```typescript
async sendLeadToBuyer(leadId: string, buyerId: string): Promise<SendLog> {
    const lead = await this.leadDAO.getById(leadId);
    const buyer = await this.buyerDAO.getById(buyerId);
    const form = await this.leadFormInputDAO.getByLeadId(leadId);

    // Build payload
    const payload = {
        form_first_name: lead.first_name,
        form_last_name: lead.last_name,
        form_phone: lead.phone,
        form_email: lead.email,
        form_address: lead.address,
        form_city: lead.city,
        form_state: lead.state,
        form_zip: lead.zipcode,
        ...form  // Merge form fields
    };

    let response: AxiosResponse;
    let status: string;

    if (process.env.NODE_ENV !== 'production') {
        // ===== MOCK MODE (Development/Staging) =====
        console.log(`[MOCK] Sending lead ${leadId} to buyer ${buyer.name}`);

        // Store to vendor_receives table instead of calling webhook
        await this.vendorReceiveDAO.create({
            payload: { ...payload, buyer_id: buyerId, buyer_name: buyer.name },
            received_at: new Date()
        });

        // Fake success response
        response = {
            status: 200,
            statusText: 'OK',
            data: { success: true, message: 'Mock send', lead_id: leadId },
            headers: {},
            config: {} as any
        } as AxiosResponse;

        status = 'sent';
    } else {
        // ===== REAL MODE (Production) =====
        console.log(`[REAL] Sending lead ${leadId} to ${buyer.webhook_url}`);

        try {
            response = await this.buyerWebhookAdapter.sendToBuyer(
                buyer.webhook_url,
                payload,
                {
                    auth_type: buyer.auth_type,
                    auth_token: buyer.auth_token,  // Already decrypted by DAO
                    auth_header_name: buyer.auth_header_name,
                    auth_header_prefix: buyer.auth_header_prefix
                }
            );

            status = response.status >= 200 && response.status < 300 ? 'sent' : 'failed';
        } catch (error) {
            console.error(`Webhook error for buyer ${buyer.name}:`, error);
            response = {
                status: 0,
                statusText: error instanceof Error ? error.message : 'Unknown error',
                data: null,
                headers: {},
                config: {} as any
            } as AxiosResponse;
            status = 'failed';
        }
    }

    // Log to send_log
    const sendLog = await this.sendLogDAO.create({
        lead_id: leadId,
        buyer_id: buyerId,
        affiliate_id: lead.affiliate_id,
        campaign_id: lead.campaign_id,
        status,
        response_code: response.status,
        response_body: JSON.stringify(response.data),
        payout_cents: response.data?.payout || null
    });

    return sendLog;
}
```

---

## 4. Auth Token Encryption/Decryption (Application-Level)

**Strategy**: Application-level encryption using Node.js crypto module

**Buyers Table Schema**:
```sql
ALTER TABLE buyers
ADD COLUMN auth_header_name VARCHAR(100),  -- For custom auth (e.g., "X-Custom-Token")
ADD COLUMN auth_header_prefix VARCHAR(50),  -- For custom auth (e.g., "Token", "ApiKey")
ADD COLUMN auth_token_encrypted TEXT;  -- Encrypted auth token
```

**Encryption Utility** (`server/src/main/utils/encryption.ts`):
```typescript
import crypto from 'crypto';

export class EncryptionService {
    private readonly algorithm = 'aes-256-cbc';
    private readonly key: Buffer;

    constructor() {
        // Encryption key from environment (32 bytes for AES-256)
        const keyString = process.env.DB_ENCRYPTION_KEY;
        if (!keyString || keyString.length !== 64) {
            throw new Error('DB_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
        }
        this.key = Buffer.from(keyString, 'hex');
    }

    encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Format: iv:encryptedText
        return iv.toString('hex') + ':' + encrypted;
    }

    decrypt(encrypted: string): string {
        const [ivHex, encryptedText] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
```

**BuyerDAO Integration**:
```typescript
@injectable()
export default class BuyerDAO {
    constructor(
        private readonly db: IDatabase<any>,
        private readonly encryptionService: EncryptionService
    ) {}

    async create(data: BuyerCreateDTO): Promise<Buyer> {
        // Encrypt auth token before storing
        const encryptedToken = data.auth_token
            ? this.encryptionService.encrypt(data.auth_token)
            : null;

        const query = `
            INSERT INTO buyers (
                name, webhook_url, auth_type,
                auth_header_name, auth_header_prefix, auth_token_encrypted,
                priority, auto_send, allow_resell, requires_validation
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const buyer = await this.db.one<Buyer>(query, [
            data.name,
            data.webhook_url,
            data.auth_type,
            data.auth_header_name || null,
            data.auth_header_prefix || null,
            encryptedToken,
            data.priority,
            data.auto_send,
            data.allow_resell,
            data.requires_validation
        ]);

        // Decrypt token for return
        return this.decryptBuyer(buyer);
    }

    async getById(id: string): Promise<Buyer | null> {
        const query = `
            SELECT * FROM buyers
            WHERE id = $1 AND deleted_at IS NULL
        `;
        const buyer = await this.db.oneOrNone<Buyer>(query, [id]);
        return buyer ? this.decryptBuyer(buyer) : null;
    }

    private decryptBuyer(buyer: Buyer): Buyer {
        if (buyer.auth_token_encrypted) {
            buyer.auth_token = this.encryptionService.decrypt(
                buyer.auth_token_encrypted
            );
        }
        return buyer;
    }
}
```

**Environment Variable**:
```bash
# Generate 32-byte (64 hex characters) encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
DB_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Recommendation**: Use **application-level encryption** for portability and control.

---

## 5. Migration from iSpeedToLeadIAO

### Phase 1: Parallel Operation

**Keep both**:
- `iSpeedToLeadIAO.ts` (old, used by current worker)
- `buyerWebhookAdapter.ts` (new, used by manual sends)

**Why**: Allows testing new adapter without breaking production

---

### Phase 2: Switch Worker

**Deploy**: Worker uses `buyerWebhookAdapter` with iSpeedToLead buyer record

**Validation**:
- Monitor logs for successful sends
- Compare old vs new response formats
- Verify same behavior

---

### Phase 3: Remove Old Code

**After 2+ weeks stable**:
- Delete `iSpeedToLeadIAO.ts`
- Remove `LEAD_VENDOR_URL` from `EnvConfig`
- Clean up imports

---

## 6. Webhook Timeout Handling

### Current Timeout: 15 seconds (hardcoded)

**Problem**: Different buyers may need different timeouts

**Solution**: Make timeout configurable per buyer

**Schema Change**:
```sql
ALTER TABLE buyers ADD COLUMN webhook_timeout_ms INTEGER DEFAULT 15000;
```

**Usage**:
```typescript
async sendToBuyer(
    webhookUrl: string,
    payload: BuyerWebhookPayload,
    authConfig: BuyerAuthConfig,
    timeoutMs: number = 15000
): Promise<AxiosResponse> {
    return await axios.post(webhookUrl, payload, {
        timeout: timeoutMs,
        headers: this.buildHeaders(authConfig)
    });
}
```

---

## 7. Retry Logic (Future Enhancement)

### Option A: Immediate Retry

```typescript
async sendToBuyerWithRetry(
    webhookUrl: string,
    payload: BuyerWebhookPayload,
    authConfig: BuyerAuthConfig,
    maxRetries: number = 3
): Promise<AxiosResponse> {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await this.sendToBuyer(webhookUrl, payload, authConfig);
        } catch (error) {
            lastError = error;
            console.warn(
                `Send attempt ${attempt}/${maxRetries} failed:`,
                error instanceof Error ? error.message : error
            );

            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                await this.sleep(1000 * Math.pow(2, attempt - 1));
            }
        }
    }

    throw lastError;
}

private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### Option B: Deferred Retry (via Worker)

**Add column**:
```sql
ALTER TABLE send_log ADD COLUMN retry_count INTEGER DEFAULT 0;
```

**Worker checks for recent failures**:
```typescript
// In BuyerDispatchService
async retryFailedSends(): Promise<void> {
    const recentFailures = await this.sendLogDAO.getRecentFailures({
        since: '1 hour ago',
        max_retries: 3
    });

    for (const log of recentFailures) {
        try {
            await this.sendLeadToBuyer(log.lead_id, log.buyer_id);
        } catch (error) {
            // Increment retry_count
        }
    }
}
```

**Recommendation**: Start with **Option A** (immediate retry). Add **Option B** if needed.

---

## 8. Testing Checklist

### Unit Tests
- [ ] `buildHeaders()` for each auth_type
- [ ] `stripNulls()` removes null/undefined/empty
- [ ] Timeout error handling
- [ ] Auth token encryption/decryption

### Integration Tests
- [ ] Send to mock buyer (non-production mode)
- [ ] Send to real buyer with bearer auth (staging)
- [ ] Send to real buyer with api_key auth (staging)
- [ ] Send to buyer with no auth (staging)
- [ ] Verify `send_log` captures response correctly
- [ ] Test timeout (mock slow webhook)
- [ ] Test retry logic (if implemented)

### Security Tests
- [ ] Auth tokens encrypted in DB
- [ ] Auth tokens not logged in plaintext
- [ ] Webhook responses don't leak sensitive data
- [ ] SQL injection resistance in buyer queries
