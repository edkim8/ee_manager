-- Migration: Create Delinquencies Table
-- Date: 2026-02-02
-- Description: Implements the Delinquencies table with Immutable History support

CREATE TABLE IF NOT EXISTS public.delinquencies (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  property_code character(2) NOT NULL,
  unit_name text NOT NULL,
  unit_id uuid NULL,
  tenancy_id text NOT NULL,
  resident text NOT NULL,
  total_unpaid numeric(10, 2) NULL DEFAULT 0.00,
  days_0_30 numeric(10, 2) NULL DEFAULT 0.00,
  days_31_60 numeric(10, 2) NULL DEFAULT 0.00,
  days_61_90 numeric(10, 2) NULL DEFAULT 0.00,
  days_90_plus numeric(10, 2) NULL DEFAULT 0.00,
  prepays numeric(10, 2) NULL DEFAULT 0.00,
  balance numeric(10, 2) NULL DEFAULT 0.00,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT delinquencies_pkey PRIMARY KEY (id),
  CONSTRAINT delinquencies_tenancy_id_fkey FOREIGN KEY (tenancy_id) REFERENCES tenancies (id) ON DELETE CASCADE,
  CONSTRAINT delinquencies_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units (id)
) TABLESPACE pg_default;

-- Trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE
UPDATE ON delinquencies FOR EACH ROW
EXECUTE FUNCTION extensions.moddatetime ('updated_at');

-- Enable RLS
ALTER TABLE public.delinquencies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON public.delinquencies
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Indexes for performance and graphing
CREATE INDEX idx_delinquencies_property ON public.delinquencies(property_code);
CREATE INDEX idx_delinquencies_tenancy_active ON public.delinquencies(tenancy_id, is_active);
CREATE INDEX idx_delinquencies_created_at ON public.delinquencies(created_at);
