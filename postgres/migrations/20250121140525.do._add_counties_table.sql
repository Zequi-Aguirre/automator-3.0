-- Step 1: Create counties table
CREATE TABLE counties (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar NOT NULL,
    state varchar NOT NULL,
    population bigint,
    created timestamp with time zone DEFAULT now() NOT NULL,
    modified timestamp with time zone DEFAULT now() NOT NULL,
    deleted timestamp with time zone,
    timezone varchar(255),
    blacklisted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Step 2: Insert counties data
INSERT INTO counties (id, name, state, blacklisted)
VALUES
    ('123e4567-e89a-12d3-b456-226600001106', 'BROWARD', 'FL', true),
    ('123e4567-e89a-12d3-b456-226600001107', 'MIAMI-DADE', 'FL', true)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Add nullable county_id column to leads
ALTER TABLE leads ADD COLUMN county_id uuid;

-- Step 4: Create index before populating data (helps with the update performance)
CREATE INDEX idx_leads_county_id ON leads(county_id);

-- Step 6: Now that data is populated, add NOT NULL constraint
ALTER TABLE leads
ALTER COLUMN county_id SET NOT NULL;

-- Step 7: Finally, add the foreign key constraint
ALTER TABLE leads
ADD CONSTRAINT fk_leads_county
FOREIGN KEY (county_id)
REFERENCES counties(id)
ON DELETE RESTRICT;  -- Prevents deletion of a county if leads reference it

-- 1. Create enum type for U.S. states
CREATE TYPE us_state AS ENUM (
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
    'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
);

-- 3. Alter column to use the ENUM type
ALTER TABLE counties
ALTER COLUMN state TYPE us_state
USING state::us_state;