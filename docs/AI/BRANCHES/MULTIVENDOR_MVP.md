# Multivendor MVP

That’s exactly the right move — let’s freeze the full technical roadmap into a single, high-fidelity message you can paste anywhere (a new chat, a ticket, or a doc).

Below is a complete, end-to-end step-by-step path for implementing the Multi-Vendor Functionality, based on everything we’ve scoped and verified from your repo, documentation, and architecture.
It’s written to be self-contained, so you can reuse it later.

⸻

🧭 Multi-Vendor Functionality — Implementation Roadmap

🎯 Goal

Enable multiple active vendors, each with independent configuration and cooldown logic, while keeping a single global worker that schedules dispatches to those vendors.

⸻

🧩 1. Database Layer

📄 Files to Modify or Create

Path	Action	Description
postgres/migrations/YYYYMMDDHHMMSS_add_vendors_and_vendor_settings.sql	Create	Adds vendors, vendor_settings, and vendor_id FKs to send_log / leads.
server/src/main/data/dao/workerSettingsDAO.ts	Modify	Restrict this DAO to global worker settings only (remove per-vendor logic).
server/src/main/data/dao/vendorDAO.ts	Create	CRUD for vendors table.
server/src/main/data/dao/vendorSettingsDAO.ts	Create	CRUD for vendor_settings table, including helpers to fetch vendor settings by vendor_id.
server/src/main/data/dao/sendLogDAO.ts	Modify	Add vendor_id column handling for inserts and queries.

🧱 Database Changes Summary
1.	New Table: vendors

id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
name varchar NOT NULL,
weight integer DEFAULT 100,
active boolean DEFAULT true,
created timestamptz DEFAULT now(),
modified timestamptz DEFAULT now(),
deleted timestamptz DEFAULT NULL


	2.	New Table: vendor_settings

id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
vendor_id uuid NOT NULL REFERENCES public."vendors"(id) ON DELETE CASCADE,
send_next_lead_at timestamptz DEFAULT NULL,
delay_same_state integer,
delay_same_county integer,
delay_same_investor integer,
min_delay integer,
max_delay integer,
states_on_hold text[] DEFAULT '{}',
minutes_range_start integer,
minutes_range_end integer,
created timestamptz DEFAULT now(),
modified timestamptz DEFAULT now(),
deleted timestamptz DEFAULT NULL


	3.	Alter Existing Tables

ALTER TABLE public."send_log"
ADD COLUMN vendor_id uuid REFERENCES public."vendors"(id) ON DELETE SET NULL;

ALTER TABLE public."leads"
ADD COLUMN vendor_id uuid REFERENCES public."vendors"(id) ON DELETE SET NULL;



⸻

⚙️ 2. Backend Services Layer

📄 Files to Modify or Create

Path	Action	Description
server/src/main/services/vendorService.ts	Create	Business logic for vendors: activation, weighting, selection.
server/src/main/services/vendorSettingsService.ts	Create	Logic for per-vendor settings, merging with defaults if needed.
server/src/main/services/workerService.ts	Modify	Replace global logic with per-vendor loop.
server/src/main/services/leadService.ts	Modify	Assign vendor_id when sending; route to proper IAO adapter.
server/src/main/services/sendLogService.ts	Modify	Include vendor_id in log creation.
server/src/main/config/envConfig.ts	Modify	Load Doppler vars matching VENDOR_<SLUG>_API_URL / VENDOR_<SLUG>_API_KEY.

🧠 Core Logic Adjustments

workerService.ts → main send loop

const workerSettings = await workerSettingsDAO.getGlobalSettings();
if (!workerSettings.worker_enabled) return;

const vendors = await vendorDAO.getActiveVendors();

for (const vendor of vendors) {
const vSettings = await vendorSettingsDAO.getByVendor(vendor.id);
if (canSendLead(workerSettings, vSettings)) {
const lead = await leadService.getNextLeadForVendor(vendor.id);
const iao = vendorResolver(vendor.name);
await iao.sendLead(lead);
await sendLogDAO.create({ lead_id: lead.id, vendor_id: vendor.id, status: 'sent' });
await vendorSettingsDAO.updateNextSend(vendor.id, calculateNextLeadTime(vSettings));
}
}

leadService.ts → sending logic
•	Add vendorId parameter to sendLead().
•	Attach vendor data to send_log and update lead state.
•	Use weighted vendor selection if a vendor isn’t explicitly chosen.

⸻

🌐 3. Resource Layer (API)

📄 Files to Modify or Create

Path	Action	Description
server/src/main/resources/vendorResource.ts	Create	REST endpoints for vendor CRUD.
server/src/main/resources/vendorSettingsResource.ts	Create	REST endpoints for vendor settings.
server/src/main/resources/settingsResource.ts	Modify	Add optional vendorId filter query param.
server/src/main/resources/sendLogResource.ts	Modify	Include vendor details in logs.

Example Route Structure:

POST   /api/vendors
GET    /api/vendors
PUT    /api/vendors/:id
DELETE /api/vendors/:id

GET    /api/vendors/:id/settings
PUT    /api/vendors/:id/settings


⸻

🧑‍💻 4. Worker & Integration Layer

📄 Files to Modify or Create

Path	Action	Description
server/src/main/worker/jobs/SendLeadsJob.ts	Modify	Replace single-vendor dispatch with per-vendor iteration.
server/src/main/worker/vendorResolver.ts	Create	Maps vendor name → correct IAO adapter.
server/src/main/vendor/iSpeedToLeadIAO.ts	Existing	Keep as template.
server/src/main/vendor/motivatedLeadsIAO.ts	New vendor adapter.
server/src/main/vendor/<otherVendor>IAO.ts	Future adapters.


⸻

🧩 5. Frontend Layer

📄 Files to Modify or Create

Path	Action	Description
client/src/components/admin/adminVendorsSection/	Create	New admin section for vendor CRUD + status toggles.
client/src/components/admin/adminVendorSettingsSection/	Create	Per-vendor settings UI (delays, cooldowns, etc.).
client/src/components/common/leadsSection/leadsTable/LeadsTable.tsx	Modify	Change “Send Now” button → modal with vendor selector.
client/src/components/admin/adminSendLogsSection/AdminSendLogsSection.tsx	Modify	Add vendor column and filters.
client/src/services/vendor.service.ts	Create	Frontend API integration for vendor CRUD.
client/src/services/vendorSettings.service.ts	Create	Frontend API integration for vendor settings.


⸻

🔧 6. Configuration & Environment

📄 Files to Modify or Create

Path	Action	Description
server/src/main/config/envConfig.ts	Modify	Dynamically load all Doppler env vars starting with VENDOR_.
.env.example / doppler.yaml	Update	Add placeholders for each vendor.

Example Doppler Variables

VENDOR_ISPEEDTOLEAD_API_URL=
VENDOR_ISPEEDTOLEAD_API_KEY=
VENDOR_MOTIVATEDLEADS_API_URL=
VENDOR_MOTIVATEDLEADS_API_KEY=


⸻

🧪 7. Testing & Validation

🔍 Unit / Integration
•	Mock adapters: Use stubbed IAOs to prevent real lead sends.
•	Test cases:
•	Vendor activation toggle.
•	Vendor cooldown enforcement.
•	Weighted routing distribution.
•	Correct vendor_id in send_log.

🧩 Manual Testing Steps
1.	Create multiple vendors in Admin UI.
2.	Configure per-vendor settings (different delays).
3.	Run worker locally.
4.	Confirm each vendor dispatches according to its cooldowns.
5.	Verify logs contain proper vendor mapping.
6.	Test “Send Now” manual send → vendor selection modal.

⸻

📋 8. Rollout Plan
1.	Deploy migration and backfill data (single default vendor).
2.	Deploy backend verticals (vendor + vendor_settings).
3.	Deploy worker refactor and test locally.
4.	Deploy frontend vendor management UI.
5.	Gradually enable new vendors and monitor send_log.
6.	Confirm cooldowns and routing percentages in production logs.

⸻

🧩 9. Key Reference Docs
•	/docs/AI/CONVERSATIONS/Automator/Multi_Vendor_Functionality_2025-12-14.md
•	/docs/AI/CONVERSATIONS/Automator/Multi_Vendor_Functionality_Scoping.md
•	/docs/AI/DATABASE_MAP.md
•	/docs/AI/SERVICE_BEHAVIOR_SUMMARY.md
•	/docs/AI/TODO_INDEX.md

⸻

✅ Final Deliverables

Phase	Deliverable	Status
1	Database migration file	⏳ Pending
2	DAO + Service layer	⏳ Pending
3	Worker refactor	⏳ Pending
4	Resource API layer	⏳ Pending
5	Frontend sections	⏳ Pending
6	Test coverage & QA	⏳ Pending


⸻

Prepared by: AskZack Automation Core
Authored with: Zequi Aguirre
Conversation ID: ASKZACK:CONV:Automator:Multi_Vendor_Functionality:2025-12-14
Branch: feature/multivendor-mvp
Next Step: Create and commit the database migration file.

⸻

This is your master “how-to-implement multi-vendor” blueprint — it covers every layer, file, and dependency.
You can paste it directly into a new chat, documentation file, or task tracker, and it’ll serve as your single source of truth for this feature rollout.