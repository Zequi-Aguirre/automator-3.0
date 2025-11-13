-- Step 1: Create counties table
CREATE TABLE counties (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar NOT NULL,
    state varchar NOT NULL,
    population bigint,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    deleted timestamp with time zone,
    timezone varchar(255)
);

-- Step 2: Insert counties data
INSERT INTO counties (id, name, state, population, timezone)
VALUES
    ('123e4567-e89a-12d3-b456-226600001101', 'El Paso', 'TX', 868763, 'America/Denver'),
    ('123e4567-e89a-12d3-b456-226600001102', 'El Paso', 'CO', 740567, 'America/Denver'),
    ('123e4567-e89a-12d3-b456-226600001103', 'Clark', 'NV', 2266715, 'America/Los_Angeles'),
    ('123e4567-e89a-12d3-b456-226600001104', 'St. Lucie', 'FL', 328297, 'America/New_York'),
    ('123e4567-e89a-12d3-b456-226600001105', 'Fresno', 'CA', 1015190, 'America/Los_Angeles'),
    ('123e4567-e89a-12d3-b456-226600001106', 'Broward', 'FL', 1947026, 'America/New_York'),
    ('123e4567-e89a-12d3-b456-226600001107', 'Miami-Dade', 'FL', 2673837, 'America/New_York'),
    ('32abaeba-d48e-469a-90bb-6056205a7f2d', 'Saint Charles', 'MO', 413803, 'America/Chicago'),
    ('f61011c6-ab10-4312-ae2e-1dc00fcb315e', 'New Haven', 'CT', 863700, 'America/New_York'),
    ('e22b8842-f110-4c7c-9b2e-869e4f80f7ea', 'Hartford', 'CT', 896854, 'America/New_York'),
    ('585d5e59-6ee8-4871-a7e0-83aa5428eeee', 'Prince Georges', 'MD', 946971, 'America/New_York'),
    ('8f397aaa-d316-44ea-83b2-575f4e556d90', 'Jefferson', 'LA', 425884, 'America/Chicago'),
    ('65711c3d-b882-4266-8ce1-29fd5a2587d2', 'East Baton Rouge', 'LA', 450544, 'America/Chicago'),
    ('123e4567-e89a-12d3-b456-226600001109', 'Cook', 'IL', 5150233, 'America/Chicago'),
    ('123e4567-e89a-12d3-b456-226600001110', 'New York', 'NY', 8336817, 'America/New_York'),
    ('123e4567-e89a-12d3-b456-226600001111', 'Klamath', 'OR', 68238, 'America/Los_Angeles'),
    ('123e4567-e89a-12d3-b456-226600001112', 'Lake', 'OR', 7895, 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add nullable county_id column to leads
ALTER TABLE leads ADD COLUMN county_id uuid;

-- Step 4: Create index before populating data (helps with the update performance)
CREATE INDEX idx_leads_county_id ON leads(county_id);

-- Step 5: Update all existing leads to New York county
UPDATE leads
SET county_id = '123e4567-e89a-12d3-b456-226600001110'
WHERE county_id IS NULL;

-- Step 6: Now that data is populated, add NOT NULL constraint
ALTER TABLE leads
ALTER COLUMN county_id SET NOT NULL;

-- Step 7: Finally, add the foreign key constraint
ALTER TABLE leads
ADD CONSTRAINT fk_leads_county
FOREIGN KEY (county_id)
REFERENCES counties(id)
ON DELETE RESTRICT;  -- Prevents deletion of a county if leads reference it

-- Add blacklisted column to counties table
ALTER TABLE counties ADD COLUMN blacklisted BOOLEAN DEFAULT FALSE;