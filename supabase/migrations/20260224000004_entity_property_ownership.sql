-- Remove equity_pct from ownership_entities (belongs on the entity↔property MTM table)
ALTER TABLE public.ownership_entities
  DROP COLUMN IF EXISTS equity_pct;

-- MTM: Ownership Entity ↔ Property with equity percentage
CREATE TABLE IF NOT EXISTS public.entity_property_ownership (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id   UUID NOT NULL REFERENCES public.ownership_entities(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    equity_pct  NUMERIC(6, 4) NOT NULL DEFAULT 0 CHECK (equity_pct >= 0 AND equity_pct <= 100),
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (entity_id, property_id)
);

CREATE TRIGGER on_entity_property_ownership_updated
    BEFORE UPDATE ON public.entity_property_ownership
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.entity_property_ownership ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entity_property_ownership_owner_access"
    ON public.entity_property_ownership
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.owner_profile_mapping opm
            WHERE opm.owner_id = entity_property_ownership.entity_id
              AND opm.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

CREATE POLICY "entity_property_ownership_admin_write"
    ON public.entity_property_ownership
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
        )
    );

CREATE INDEX IF NOT EXISTS idx_entity_property_ownership_entity   ON public.entity_property_ownership(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_property_ownership_property ON public.entity_property_ownership(property_id);
