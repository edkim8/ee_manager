-- Rename total_equity_invested → equity_pct and change to percentage (0.00–100.00)
ALTER TABLE public.ownership_entities
  RENAME COLUMN total_equity_invested TO equity_pct;

ALTER TABLE public.ownership_entities
  ALTER COLUMN equity_pct TYPE NUMERIC(6, 4),
  ALTER COLUMN equity_pct SET DEFAULT 0;
