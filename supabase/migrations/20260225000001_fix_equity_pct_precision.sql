-- Fix equity_pct precision: NUMERIC(6,4) only allows up to 99.9999
-- Change to NUMERIC(5,2) to support 0–100.00
ALTER TABLE public.entity_property_ownership
  ALTER COLUMN equity_pct TYPE NUMERIC(5, 2);

ALTER TABLE public.owner_profile_mapping
  ALTER COLUMN equity_pct TYPE NUMERIC(5, 2);
