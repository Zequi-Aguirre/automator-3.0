-- Step 1: Add email to leads table
ALTER TABLE public."leads" ADD COLUMN "email" VARCHAR(100);

-- Step 2: Drop unnecessary fields from leads table
ALTER TABLE public."leads" DROP COLUMN "ping_id";
ALTER TABLE public."leads" DROP COLUMN "buyer";
ALTER TABLE public."leads" DROP COLUMN "payout";
ALTER TABLE public."leads" DROP COLUMN "status";
ALTER TABLE public."leads" DROP COLUMN "ping_result";
ALTER TABLE public."leads" DROP COLUMN "ping_message";
ALTER TABLE public."leads" DROP COLUMN "error_message";

-- Step 3: Create buyers table
CREATE TABLE public."buyers" (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    is_mock BOOLEAN NOT NULL DEFAULT TRUE,
    created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted TIMESTAMP WITH TIME ZONE,
    CONSTRAINT buyers_pkey PRIMARY KEY (id)
);

-- Create index on deleted for buyers
CREATE INDEX buyers_deleted_idx ON public."buyers" (deleted) WHERE deleted IS NULL;

-- Step 4: Create buyer_lead table
CREATE TABLE public."buyer_lead" (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public."leads" (id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public."buyers" (id) ON DELETE CASCADE,
    ping_id VARCHAR(100) DEFAULT NULL,
    payout VARCHAR(100) DEFAULT NULL,
    status VARCHAR(50) DEFAULT NULL,
    ping_result VARCHAR(255) DEFAULT NULL,
    ping_message VARCHAR(255) DEFAULT NULL,
    error_message VARCHAR(255) DEFAULT NULL,
    created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    CONSTRAINT buyer_lead_pkey PRIMARY KEY (id)
);

-- Create indexes for buyer_lead
CREATE INDEX buyer_lead_deleted_idx ON public."buyer_lead" (deleted) WHERE deleted IS NULL;
CREATE INDEX buyer_lead_lead_id_idx ON public."buyer_lead" (lead_id) WHERE deleted IS NULL;
CREATE INDEX buyer_lead_buyer_id_idx ON public."buyer_lead" (buyer_id) WHERE deleted IS NULL;