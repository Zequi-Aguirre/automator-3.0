# Tutorial Request: Source & Campaign API Authentication System

**Date:** 2026-03-01
**For:** Automator 2.0 - Lead Intake API Authentication
**Reference Implementation:** Northstar App (other project)
**Ticket:** TICKET-046

---

## Purpose

This document will be used to prompt Claude in the **Northstar** project session to generate a comprehensive tutorial explaining how the lead source API authentication system works. That tutorial will then be used to implement the same system in **Automator 2.0**.

---

## Prompt to Use in Northstar Project

```
I need you to create a comprehensive tutorial document explaining how the lead source and campaign API authentication system works in this codebase. This tutorial will be used to implement the same system in another project (Automator 2.0).

Please analyze and document the following:

## 1. Database Schema
- What tables exist for sources (or affiliates) and campaigns?
- What columns do they have?
- How are API keys stored? (encrypted? hashed? column names?)
- What indexes exist?
- How are sources and campaigns related?
- How are leads associated with sources/campaigns?

## 2. API Key Generation & Storage
- How are API keys generated? (what algorithm/library?)
- What format are they? (UUID? random string? length?)
- How are they encrypted before storage? (AES-256? algorithm details?)
- What encryption utility functions exist?
- Where is the encryption key stored? (environment variable name?)

## 3. Authentication Middleware
- What middleware handles API key authentication?
- How does it extract the API key from the request? (header name?)
- How does it validate the API key?
- What does it attach to the request object? (source? campaign? both?)
- What happens on invalid/missing API key? (401? error format?)

## 4. Lead Intake Flow
- How does the lead intake endpoint use the authenticated source/campaign?
- How are leads associated with the source/campaign during creation?
- What fields are set on the lead record?

## 5. Admin UI - API Key Management
- How do admins generate API keys for sources?
- How is the API key displayed? (one-time show? masked?)
- Can API keys be regenerated? (what happens to old key?)
- How is the copy-to-clipboard functionality implemented?
- What components handle this UI?

## 6. Important Details
- Any gotchas or edge cases?
- Security considerations?
- Migration files that created this?
- Testing approaches?

## Output Format
Please create a tutorial document in markdown format that includes:
- Clear section headers
- Code examples (migrations, types, middleware, etc.)
- File paths for reference
- Step-by-step explanation of the flow
- Any important notes or warnings

The goal is to make it easy for another developer (or AI) to implement this exact system in a different codebase without having to reverse-engineer it.
```

---

## What We'll Implement in Automator 2.0

Once we have the tutorial from Northstar, we'll implement:

### Database (Migration)
- Create `sources` table (or keep `affiliates` naming)
  - `id`, `name`, `api_key_encrypted`, `created`, `modified`, `deleted`
- Create `campaigns` table
  - `id`, `source_id`, `name`, `created`, `modified`, `deleted`
- Update `leads` table
  - Add `source_id` column (references sources)
  - Keep existing `campaign_id` column (references campaigns)
- Indexes for performance and uniqueness

### Backend
- **Encryption utility** - Reuse buyer auth token encryption logic
- **sourceDAO** - CRUD operations with encryption/decryption
- **campaignDAO** - CRUD operations with source relationship
- **apiKeyAuth middleware** - Extract API key, authenticate, attach source/campaign to request
- **leadIntakeResource** - Use authenticated source/campaign from middleware
- **leadService** - Update `importLeadsFromApi()` to accept and set source/campaign

### Frontend (Admin UI)
- **Sources management page**
  - List sources
  - Create/edit source
  - Generate/regenerate API key
  - One-time display of API key with copy button
- **Campaigns management** (nested under source or separate)
  - List campaigns for source
  - Create/edit campaigns
  - Associate with source

### Testing
- Generate API key for test source
- Send lead via API with valid key → should succeed
- Send lead via API with invalid key → should return 401
- Regenerate API key → old key should fail

---

## Key Design Decisions for Automator 2.0

Based on user input:

1. **Terminology:** Call it "source" (not "affiliate")
2. **Campaign tracking:** Track by name, warn users that changing campaign name creates new campaign
3. **API key storage:** Encrypt like buyer auth tokens (AES-256)
4. **Campaign association:** Source has many campaigns, lead belongs to one campaign
5. **Authentication:** Extract from `x-api-key` header (or whatever Northstar uses)

---

## Files That Will Be Created/Modified

**New files:**
- `postgres/migrations/YYYYMMDD_create_sources_and_campaigns.sql`
- `server/src/main/data/sourceDAO.ts`
- `server/src/main/data/campaignDAO.ts`
- `server/src/main/services/sourceService.ts`
- `server/src/main/services/campaignService.ts`
- `server/src/main/resources/sourceResource.ts`
- `server/src/main/resources/campaignResource.ts`
- `server/src/main/types/sourceTypes.ts`
- `server/src/main/types/campaignTypes.ts` (update existing)
- `client/src/services/source.service.ts`
- `client/src/services/campaign.service.ts`
- `client/src/components/admin/adminSourcesSection/`
- `client/src/components/admin/adminCampaignsSection/`

**Modified files:**
- `server/src/main/middleware/apiKeyAuth.ts` - Update authentication logic
- `server/src/main/resources/leadIntakeResource.ts` - Use authenticated source/campaign
- `server/src/main/services/leadService.ts` - Update `importLeadsFromApi()`
- `server/src/main/types/leadTypes.ts` - Add source_id if needed
- `client/src/context/routes/AdminRoutes.tsx` - Add source/campaign routes
- `client/src/components/navBar/NavBar.tsx` - Add navigation items

---

## Success Criteria

✅ Source can be created with unique API key
✅ API key is encrypted in database
✅ Lead intake API authenticates by API key
✅ Leads are associated with correct source/campaign
✅ Invalid API key returns 401
✅ API key can be regenerated (old key stops working)
✅ Admin can copy API key from UI
✅ Campaign names are tracked independently

---

## Next Steps

1. **USER ACTION:** Open Claude Code in Northstar project
2. **USER ACTION:** Use the prompt above to generate tutorial
3. **USER ACTION:** Save tutorial to this project's `_claude/planning/` folder
4. **DEV ACTION:** Implement based on tutorial (like county matching)
5. **TEST:** Verify all acceptance criteria

---

**Status:** 🟡 Waiting for tutorial from Northstar project
**Assigned:** User to generate tutorial
**Target:** TICKET-046 implementation
