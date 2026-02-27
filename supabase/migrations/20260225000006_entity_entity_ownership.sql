-- Migration: Entity-Entity Ownership (middle layer of 4-tier ownership model)
-- Date: 2026-02-25
-- Description: Adds the personal entity → property entity relationship.
--   Full chain: Person → Personal Entity (Trust/Individual) → Property Entity (LP/Corp) → Property
--   Personal entities hold GL codes; property entities do not.

-- 1. Add 'LP' to entity_type constraint
--    (Individual already exists; LP is needed for Limited Partnerships like Whispering Oaks LP)
ALTER TABLE public.ownership_entities
  DROP CONSTRAINT IF EXISTS ownership_entities_entity_type_check;

ALTER TABLE public.ownership_entities
  ADD CONSTRAINT ownership_entities_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'LLC'::text,
    'Corporation'::text,
    'Individual'::text,
    'Partnership'::text,
    'LP'::text,
    'REIT'::text,
    'Trust'::text
  ]));

-- 2. Create entity_entity_ownership table
--    owner_entity_id = personal entity (Trust/Individual) — the one that HOLDS the interest
--    owned_entity_id = property entity (LP/Corp/LLC) — the entity being OWNED
CREATE TABLE public.entity_entity_ownership (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_entity_id UUID NOT NULL REFERENCES public.ownership_entities(id) ON DELETE CASCADE,
  owned_entity_id UUID NOT NULL REFERENCES public.ownership_entities(id) ON DELETE CASCADE,
  equity_pct      NUMERIC(5,2) NOT NULL DEFAULT 0
                    CHECK (equity_pct >= 0 AND equity_pct <= 100),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT entity_entity_ownership_unique
    UNIQUE (owner_entity_id, owned_entity_id),
  CONSTRAINT entity_entity_ownership_no_self_ref
    CHECK (owner_entity_id != owned_entity_id)
);

CREATE INDEX ON public.entity_entity_ownership(owner_entity_id);
CREATE INDEX ON public.entity_entity_ownership(owned_entity_id);

-- Auto-update updated_at
CREATE TRIGGER entity_entity_ownership_updated_at
  BEFORE UPDATE ON public.entity_entity_ownership
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- 3. RLS
ALTER TABLE public.entity_entity_ownership ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_entity_entity_ownership"
  ON public.entity_entity_ownership FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admins_can_write_entity_entity_ownership"
  ON public.entity_entity_ownership FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = true)
  );

GRANT SELECT ON public.entity_entity_ownership TO authenticated;
