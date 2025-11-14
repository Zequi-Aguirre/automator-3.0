ALTER TABLE public."lead_form_inputs"
    ALTER COLUMN form_multifamily DROP NOT NULL,
    ALTER COLUMN form_repairs DROP NOT NULL,
    ALTER COLUMN form_occupied DROP NOT NULL,
    ALTER COLUMN form_sell_fast DROP NOT NULL,
    ALTER COLUMN form_goal DROP NOT NULL,
    ALTER COLUMN form_owner DROP NOT NULL,
    ALTER COLUMN form_owned_years DROP NOT NULL,
    ALTER COLUMN form_listed DROP NOT NULL;