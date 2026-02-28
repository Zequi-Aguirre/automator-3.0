# Domain and Data Model

## Core Entities

### Lead Lifecycle

**leads**
- Primary entity: address, contact info, county, investor
- States: `verified` (boolean), `sent` (boolean), `deleted` (soft-delete)
- Lifecycle: Imported → Verified → Sent → Logged
- Relationships: 1:1 with `lead_form_inputs`, N:1 with `county`, optional N:1 with `investor`

**lead_form_inputs**
- Additional details required for vendor submission
- Fields: property details, owner info, motivation, call preferences
- `last_post_status`, `last_post_payload`: tracking vendor send attempts

**send_log**
- Audit trail of all vendor submissions
- Fields: `status` (sent/failed), `response_code`, `response_body`, `payout_cents`
- FKs: `lead_id`, `affiliate_id`, `campaign_id`, `investor_id`, `vendor_id`

### Business Entities

**affiliates**
- Lead source organizations
- Fields: `name`, `blacklisted`, `whitelisted`, `rating` (1-5)

**campaigns**
- Marketing campaigns under affiliates
- Fields: `name`, `affiliate_id`, `blacklisted`, `whitelisted`, `rating` (1-5)

**investors**
- Lead buyers/recipients
- Fields: `name`, `blacklisted`, `whitelisted`, `rating` (1-5)
- **Optional on leads**: leads can exist without investor assignment

**counties**
- Geographic regions with timezone data
- Fields: `name`, `state` (us_state ENUM), `timezone`, `blacklisted`, `whitelisted`, `population`
- **Required on leads**: all leads must have valid county

### System Entities

**users**
- Admin/user accounts
- Roles: `superadmin`, `admin`, `user`, `worker`
- Auth: bcrypt encrypted_password, JWT tokens

**jobs**
- Background job definitions
- Fields: `name`, `description`, `interval_minutes`, `is_paused`, `last_run`
- Current jobs: `sendLeads`, `trashExpireLeads`

**worker_settings**
- Singleton configuration (id `123e4567-e89b-12d3-b456-226600000501`)
- Fields:
  - `cron_schedule`: when worker runs (e.g., `* * * * *`)
  - `worker_enabled`: boolean flag to enable/disable worker
  - `business_hours_start`, `business_hours_end`: minutes since midnight
  - `minutes_range_start`, `minutes_range_end`: randomized delay between sends
  - `delay_same_county`, `delay_same_investor`: cooldown hours
  - `expire_after_hours`: when to trash unsent leads
  - `states_on_hold`: text[] of state codes to skip
  - `send_next_lead_at`: timestamp of next scheduled send

**vendors**
- Multi-vendor support (MVP in progress)
- Fields: `name`, `active`, `weight`
- Current: `iSpeedToLeadIAO` (inserted by migration)

**vendor_receives**
- Mock vendor endpoint for testing
- Fields: `payload` (JSONB), `received_at`

## Database Schema Conventions

**All tables include**:
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `created` timestamp with time zone DEFAULT now()
- `modified` timestamp with time zone DEFAULT now()
- `deleted` timestamp with time zone (NULL = active)

**Soft-delete pattern**:
- Never permanently delete records
- Set `deleted = NOW()` and optional `deleted_reason`
- DAOs filter `WHERE deleted IS NULL`

**Foreign key actions**:
- `ON DELETE SET NULL`: affiliates, campaigns, investors, vendors
- `ON DELETE RESTRICT`: counties (cannot delete if leads reference)
- `ON DELETE CASCADE`: lead_form_inputs (delete with parent lead)

## Key Relationships

```
affiliates (1) ──< (N) campaigns
leads (N) ──> (1) counties [REQUIRED]
leads (N) ──> (1) investors [OPTIONAL]
leads (1) ──< (1) lead_form_inputs [UNIQUE]
leads (1) ──< (N) send_log
send_log (N) ──> (1) vendors
send_log (N) ──> (1) affiliates
send_log (N) ──> (1) campaigns
send_log (N) ──> (1) investors
```

## Business Rules

### Blacklist Logic
If ANY linked entity is blacklisted → lead is trashed
- County blacklisted → trash with `deleted_reason='BLACKLISTED_COUNTY'`
- Investor blacklisted → trash with `deleted_reason='BLACKLISTED_INVESTOR'`

### Cooldown Logic
Prevents sending multiple leads from same entity within N hours:
- County cooldown: `delay_same_county` hours (default 36)
- Investor cooldown: `delay_same_investor` hours (default 48)
- Check `send_log` for last send to entity

### Whitelist Override
- `whitelisted=true` bypasses cooldown restrictions
- **Consumed after one use** (implementation in DAO layer)

### Lead Expiration
- Leads older than `expire_after_hours` (default 18) are soft-deleted
- `deleted_reason='EXPIRED_18_HOURS'` (or configured hours)

### Timezone-Aware Business Hours
- Each county has `timezone` (e.g., 'America/New_York')
- Worker converts current time to county local time
- Only sends if local time between `business_hours_start` and `business_hours_end`

## Data Validation

**Lead import requires**:
- `address`, `city`, `state`, `county` (CSV or API)
- County lookup by `name + state` → creates if not exists
- Investor lookup by `id` or `name` (optional)

**Lead verification requires**:
- `lead_form_inputs` row created
- All required form fields populated (varies by form)

**Lead send requires**:
- `verified = true`
- `sent = false`
- `deleted IS NULL`
- Pass all filter checks (blacklist, cooldown, business hours)
