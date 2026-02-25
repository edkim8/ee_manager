-- Add equity_pct and role to owner_profile_mapping
-- equity_pct: the user's ownership stake percentage within the entity
-- role: their position in the entity (GP, LP, Member, Trustee)

ALTER TABLE public.owner_profile_mapping
  ADD COLUMN IF NOT EXISTS equity_pct NUMERIC(6, 4) NOT NULL DEFAULT 0
    CHECK (equity_pct >= 0 AND equity_pct <= 100),
  ADD COLUMN IF NOT EXISTS role TEXT
    CHECK (role IN ('General Partner', 'Limited Partner', 'Member', 'Trustee')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER on_owner_profile_mapping_updated
    BEFORE UPDATE ON public.owner_profile_mapping
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
