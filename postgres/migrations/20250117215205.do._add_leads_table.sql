create table "public"."leads" (
    "id" uuid not null default gen_random_uuid(),
    -- Required fields from initial ping
    "address" varchar(255) not null,
    "city" varchar(100) not null,
    "state" varchar(2) not null,
    "zipcode" varchar(10) not null,
    "county" varchar(100),
    -- Required fields for post
    "first_name" varchar(100),
    "last_name" varchar(100),
    "phone" varchar(20) unique,
    "email" varchar(255),
    "created" timestamp with time zone default now(),
    "modified" timestamp with time zone default now(),
    "deleted" timestamp with time zone,
    "imported_at" timestamp with time zone,
    "verified" boolean default false,
    "sent" boolean default false,
    "sent_date" timestamp with time zone,

    constraint "leads_pkey" primary key ("id")
);