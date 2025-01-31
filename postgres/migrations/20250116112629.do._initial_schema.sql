create table "public"."leads" (
    "id" uuid not null default gen_random_uuid(),
    -- Required fields from initial ping
    "address" varchar(255) not null,
    "city" varchar(100) not null,
    "state" varchar(2) not null,
    "zipcode" varchar(10) not null,
    -- Required fields for post
    "first_name" varchar(100),
    "last_name" varchar(100),
    "phone" varchar(20),
    -- API response fields
    "ping_id" varchar(100),
    "buyer" varchar(255),
    "payout" varchar(100),
    -- Status tracking
    "status" varchar(20) not null default 'pending',
    "is_test" boolean not null default false,
    -- Standard tracking fields
    "ping_result" varchar(255),
    "ping_message" varchar(255),
    "error_message" varchar(255),
    "created" timestamp with time zone default now(),
    "modified" timestamp with time zone default now(),
    "deleted" timestamp with time zone,

    constraint "leads_pkey" primary key ("id")
);

-- Create index on status for efficient queries
create index "leads_status_idx" on "public"."leads" ("status") where deleted is null;

-- Create index on ping_id for efficient lookups
create index "leads_ping_id_idx" on "public"."leads" ("ping_id") where deleted is null;

-- Create index on test status
create index "leads_is_test_idx" on "public"."leads" ("is_test") where deleted is null;