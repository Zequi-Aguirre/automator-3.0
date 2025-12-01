-- 1) Create a replacement enum without DC
CREATE TYPE us_state_new AS ENUM (
    'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL',
    'GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
    'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
    'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
    'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI',
    'WY'
);

-- 2) Alter columns using us_state to the new type
ALTER TABLE counties
ALTER COLUMN state TYPE us_state_new
USING state::text::us_state_new;

-- If other tables use us_state, repeat the same ALTER COLUMN for each.

-- 3) Drop old enum and rename new one
DROP TYPE us_state;
ALTER TYPE us_state_new RENAME TO us_state;