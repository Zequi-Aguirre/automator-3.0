ALTER TABLE public."worker_settings" DROP COLUMN counties_on_hold;
ALTER TABLE public."worker_settings" ADD COLUMN delay_same_investor INTEGER DEFAULT 16;
ALTER TABLE public."worker_settings" ALTER COLUMN delay_same_county SET DEFAULT 36;

ALTER TABLE public.investors
    ADD COLUMN rating INTEGER DEFAULT 1 CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE public.affiliates
    ALTER COLUMN rating SET DEFAULT 1;

ALTER TABLE public.campaigns
    ALTER COLUMN rating SET DEFAULT 1;

create table public."lead_form_inputs" (
    id uuid not null default gen_random_uuid(),
    lead_id uuid not null references public."leads" ("id") on delete cascade,

    -- API-required / frontend-validated values
    form_unit varchar(50),
    form_multifamily varchar(50) not null,
    form_square varchar(50),
    form_year varchar(50),
    form_garage varchar(50),
    form_bedrooms varchar(50),
    form_bathrooms varchar(50),
    form_repairs text not null,         -- multiselect, stored newline-separated
    form_occupied varchar(50) not null,
    form_sell_fast varchar(50) not null,
    form_goal text not null,            -- multiselect, stored newline-separated
    form_goal2 text,
    form_call_time varchar(50),
    form_owner varchar(50) not null,
    form_owned_years varchar(50) not null,
    form_listed varchar(50) not null,
    form_scenario text,                -- multiselect, stored newline-separated
    form_source varchar(50),
    activeprospect_certificate_url text,

    -- bookkeeping for send
    last_post_status varchar(20),     -- sent | failed
    last_post_payload jsonb,
    last_post_at timestamp with time zone,

    created timestamp with time zone default now(),
    modified timestamp with time zone default now(),
    deleted timestamp with time zone,

    constraint lead_form_inputs_pkey primary key (id),
    constraint lead_form_inputs_lead_unique unique (lead_id)
);

create index lfi_lead_idx on public."lead_form_inputs" (lead_id);
create index lfi_deleted_idx on public."lead_form_inputs" (deleted) where deleted is null;

create table public."send_log" (
  id uuid not null default gen_random_uuid(),
  lead_id uuid not null references public."leads" ("id") on delete cascade,
  affiliate_id uuid references public."affiliates" ("id") on delete set null,
  campaign_id uuid references public."campaigns" ("id") on delete set null,
  investor_id uuid references public."investors" ("id") on delete set null,

  status varchar(10) not null,         -- sent | failed (no throttled or blocked)
  response_code integer,
  response_body text,
  payout_cents integer,                -- optional: if API returns it in response
  created timestamp with time zone default now(),
  modified timestamp with time zone default now(),
  deleted timestamp with time zone,

  constraint send_log_pkey primary key (id)
);

create index send_log_lead_idx on public."send_log" (lead_id);
create index send_log_campaign_time_idx on public."send_log" (campaign_id, created);
create index send_log_affiliate_time_idx on public."send_log" (affiliate_id, created);
create index send_log_investor_time_idx on public."send_log" (investor_id, created);