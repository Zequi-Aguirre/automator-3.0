-- Add nullable column first
ALTER TABLE public."buyer_lead" ADD COLUMN campaign_id UUID
REFERENCES public."campaigns" (id) ON DELETE CASCADE;

-- Update existing records with default UUID
UPDATE public."buyer_lead" SET campaign_id = '123e4567-e89b-12d3-b456-226600000401';

-- Add NOT NULL constraint
ALTER TABLE public."buyer_lead" ALTER COLUMN campaign_id SET NOT NULL;

-- Add index
CREATE INDEX buyer_lead_campaign_id_idx ON public."buyer_lead" (campaign_id) WHERE deleted IS NULL;

-- Add columns to leads table
ALTER TABLE public."leads" ADD COLUMN zb_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE public."leads" ADD COLUMN county VARCHAR(255) DEFAULT NULL;