CREATE TABLE public.investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    blacklisted BOOLEAN DEFAULT FALSE,
    created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    modified TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE public.affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    blacklisted BOOLEAN DEFAULT FALSE,
    rating INTEGER DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
    created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    modified TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    blacklisted BOOLEAN DEFAULT FALSE,
    rating INTEGER DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
    created TIMESTAMP WITH TIME ZONE DEFAULT now(),
    modified TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

ALTER TABLE public.leads
ADD COLUMN investor_id UUID,
ADD COLUMN affiliate_id UUID,
ADD COLUMN campaign_id UUID;

ALTER TABLE public.leads
ADD CONSTRAINT fk_investor
FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE SET NULL;

ALTER TABLE public.leads
ADD CONSTRAINT fk_affiliate
FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE SET NULL;

ALTER TABLE public.leads
ADD CONSTRAINT fk_campaign
FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;