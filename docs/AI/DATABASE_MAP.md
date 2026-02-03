# 🧠 Automator Database Map

### **Date:** 2025-12-14

---

## 🧱 Section A – Current Database Schema

### **affiliates**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `name` varchar NOT NULL
- `blacklisted` boolean DEFAULT false
- `whitelisted` boolean DEFAULT false
- `rating` integer DEFAULT 1
- `created` timestamptz DEFAULT now()
- `modified` timestamptz DEFAULT now()
- `deleted` timestamptz NULL

### **campaigns**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `name` varchar NOT NULL
- `affiliate_id` uuid REFERENCES affiliates(id)
- `blacklisted` boolean DEFAULT false
- `whitelisted` boolean DEFAULT false
- `rating` integer DEFAULT 1
- `created`, `modified` timestamptz DEFAULT now()
- `deleted` timestamptz NULL

### **counties**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `name` varchar NOT NULL
- `state` enum (user-defined)
- `population` bigint
- `timezone` varchar
- `blacklisted` boolean DEFAULT false
- `whitelisted` boolean DEFAULT false
- `created`, `modified` timestamptz DEFAULT now()
- `deleted` timestamptz NULL

### **investors**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `name` varchar NOT NULL
- `blacklisted` boolean DEFAULT false
- `whitelisted` boolean DEFAULT false
- `rating` integer DEFAULT 1
- `created`, `modified` timestamptz DEFAULT now()
- `deleted` timestamptz NULL

### **jobs**
- `id` uuid PRIMARY KEY DEFAULT uuid_generate_v4()
- `name` varchar NOT NULL
- `description` text
- `interval_minutes` integer NOT NULL
- `last_run` timestamptz
- `is_paused` boolean DEFAULT false
- `created`, `updated` timestamptz DEFAULT now()
- `deleted` timestamptz NULL

### **leads**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `address`, `city`, `state`, `zipcode` varchar NOT NULL
- `county` varchar
- `first_name`, `last_name`, `phone`, `email` varchar
- `created`, `modified` timestamptz DEFAULT now()
- `deleted`, `imported_at` timestamptz
- `verified` boolean DEFAULT false
- `sent` boolean DEFAULT false
- `sent_date` timestamptz
- `deleted_reason` text
- `investor_id` uuid REFERENCES investors(id)
- `campaign_id` uuid REFERENCES campaigns(id)
- `county_id` uuid REFERENCES counties(id)

### **lead_form_inputs**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `lead_id` uuid REFERENCES leads(id)
- 20+ form_* fields (text/varchar)
- `activeprospect_certificate_url` text
- `last_post_status` varchar
- `last_post_payload` jsonb
- `last_post_at` timestamptz
- `created`, `modified`, `deleted` timestamptz

### **send_log**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `lead_id` uuid REFERENCES leads(id)
- `affiliate_id` uuid REFERENCES affiliates(id)
- `campaign_id` uuid REFERENCES campaigns(id)
- `investor_id` uuid REFERENCES investors(id)
- `status` varchar NOT NULL
- `response_code` integer
- `response_body` text
- `payout_cents` integer
- `created`, `modified`, `deleted` timestamptz DEFAULT now()

### **users**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `email` varchar NOT NULL
- `encrypted_password` varchar NOT NULL
- `name` varchar NOT NULL
- `role` varchar DEFAULT 'user'
- `created`, `modified`, `deleted` timestamptz DEFAULT now()

### **vendor_receives**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `payload` jsonb NOT NULL
- `received_at` timestamptz DEFAULT now()

### **worker_settings**
- `id` uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `name` varchar NOT NULL
- `send_next_lead_at`, `last_worker_run` timestamptz
- `minutes_range_start`, `minutes_range_end` integer
- `business_hours_start`, `business_hours_end` varchar NOT NULL
- `delay_same_state`, `delay_same_county`, `delay_same_investor` integer
- `min_delay`, `max_delay` integer
- `expire_after_hours` integer DEFAULT 18
- `worker_enabled` boolean DEFAULT false
- `cron_schedule` text
- `states_on_hold` array
- `created`, `modified`, `deleted` timestamptz DEFAULT now()

---

## 🔗 Section B – Entity Relationship Overview

```
affiliates ─┬─ campaigns ─┬─ leads ─┬─ lead_form_inputs
             │             ├─ send_log ─► vendors (new)
             │             └─ investors
counties ─────┘
```

---

## 🧩 Section C – Multi-Vendor Vertical Plan

### **Goal:**
Transition Automator to support **multi-vendor routing and per-vendor scheduling.**

### **1. New Table: vendors (conceptual)**
| Column | Type | Default | Description |
|---------|------|----------|--------------|
| `id` | uuid | gen_random_uuid() | Primary key |
| `name` | varchar | — | Vendor name |
| `api_endpoint` | text | — | Vendor lead submission endpoint |
| `api_key` | text | — | Vendor authentication credential |
| `contact_email` | varchar | — | Vendor notification contact |
| `worker_enabled` | boolean | false | Whether vendor dispatch is active |
| `delay_same_state` | integer | NULL | Override delay for state-based dispatch |
| `delay_same_county` | integer | NULL | Override delay for county-based dispatch |
| `delay_same_investor` | integer | NULL | Override delay for investor dispatch |
| `min_delay` | integer | NULL | Minimum dispatch delay |
| `max_delay` | integer | NULL | Maximum dispatch delay |
| `expire_after_hours` | integer | NULL | Lead expiration time |
| `created`, `modified`, `deleted` | timestamptz | now() | Audit timestamps |

### **2. Alter Existing Table: send_log**
- Add `vendor_id uuid REFERENCES vendors(id)`.
- Maintain `lead_id`, `campaign_id`, and `investor_id` for historical trace.

### **3. Worker & Settings Implications**
- `worker_settings` currently applies globally.  
- Introduce vendor-specific overrides (vendor row values take priority over defaults).  
- Worker logic changes:
  - Load vendor’s custom timing config.
  - Randomize delay within vendor’s range.
  - Record last send time per vendor.

---

**Prepared by:** AskZack Automation Core  
**Date:** 2025-12-14  
**Phase:** Backend Schema Analysis  
**Next Step:** Define DAO and Service layers for new `vendors` entity