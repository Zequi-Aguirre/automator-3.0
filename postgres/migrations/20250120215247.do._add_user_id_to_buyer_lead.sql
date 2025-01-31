ALTER TABLE public."buyer_lead" ADD COLUMN user_id UUID
REFERENCES public."users" (id) ON DELETE CASCADE;

ALTER TABLE public."worker_settings" ADD COLUMN delay_same_county INTEGER DEFAULT 31;

-- add 2 more columns to worker_settings min_delay and max_delay
ALTER TABLE public."worker_settings" ADD COLUMN min_delay INTEGER DEFAULT 2;
ALTER TABLE public."worker_settings" ADD COLUMN max_delay INTEGER DEFAULT 4;

ALTER TABLE public."buyer_lead" ALTER COLUMN buyer_id DROP NOT NULL;
ALTER TABLE public."buyer_lead" ADD COLUMN sent_by_user_id UUID REFERENCES public."users" (id) ON DELETE CASCADE;
ALTER TABLE public."buyer_lead" DROP COLUMN user_id;

ALTER TABLE public."leads" ADD COLUMN vendor_lead_id VARCHAR(255);