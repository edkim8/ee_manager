-- Increase equity_pct precision on entity_entity_ownership to 4 decimal places
-- NUMERIC(7,4) supports 0.0000 to 100.0000 (3 digits before decimal + 4 after)
ALTER TABLE public.entity_entity_ownership
  ALTER COLUMN equity_pct TYPE NUMERIC(7, 4);
