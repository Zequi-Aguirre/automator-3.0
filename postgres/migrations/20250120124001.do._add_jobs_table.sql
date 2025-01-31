-- Create jobs table
CREATE TABLE public."jobs" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    interval_minutes INTEGER NOT NULL,
    last_run TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    is_paused BOOLEAN DEFAULT false,
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Add index for job lookups
CREATE INDEX jobs_name_idx ON public."jobs" (name) WHERE deleted IS NULL;

-- Add index for job execution
CREATE INDEX jobs_execution_idx ON public."jobs" (last_run, interval_minutes) WHERE deleted IS NULL AND is_paused = false;

-- Insert initial jobs
INSERT INTO public."jobs" (name, description, interval_minutes)
    VALUES ('sendLeads', 'Sends leads to buyers on an interval', 1);