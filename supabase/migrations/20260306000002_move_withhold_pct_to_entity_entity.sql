-- Migration: Move withhold_pct from owner_profile_mapping → entity_entity_ownership
-- Date: 2026-03-06
-- Reason: withhold_pct must be per-relationship (personal entity ↔ property entity),
--   not per-person across all their holdings. The same trust may have 7% withholding
--   on its N Avenue LP (CV) interest but 0% on all other property entity interests.
--   entity_entity_ownership is the correct table because it represents exactly that
--   link: personal entity → specific property entity.

-- 1. Remove from owner_profile_mapping (added by 20260306000001)
ALTER TABLE public.owner_profile_mapping
  DROP COLUMN IF EXISTS withhold_pct;

-- 2. Add to entity_entity_ownership
ALTER TABLE public.entity_entity_ownership
  ADD COLUMN IF NOT EXISTS withhold_pct NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (withhold_pct >= 0 AND withhold_pct <= 100);

COMMENT ON COLUMN public.entity_entity_ownership.withhold_pct IS
  'CA non-resident withholding rate for this personal entity''s interest in this property entity. '
  'Set to 7 for CV (N Avenue LP) non-resident owners GL 33015-000 and 33006-000. '
  'All other relationships default to 0. Used for CA Form 592 reporting.';
