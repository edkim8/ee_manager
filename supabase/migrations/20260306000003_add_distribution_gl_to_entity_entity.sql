-- Migration: Add distribution_gl to entity_entity_ownership
-- Date: 2026-03-06
-- Reason: distribution_gl is per-relationship (personal entity ↔ property entity),
--   not per-person. The same Trust may have GL 33015-000 for N Avenue LP (CV)
--   and a different GL for WO LP. entity_entity_ownership is the correct table
--   because it represents exactly that link. This is the same reasoning as withhold_pct.
--   The distribution_gl on owner_profile_mapping is left in place but is no longer
--   the source of truth for distributions.

ALTER TABLE public.entity_entity_ownership
  ADD COLUMN IF NOT EXISTS distribution_gl TEXT;

COMMENT ON COLUMN public.entity_entity_ownership.distribution_gl IS
  'Yardi GL code for this personal entity''s distributions from this property entity. '
  'Snapshotted onto distribution_line_items at event creation. '
  'Example: 33015-000 for N Avenue LP (CV) non-resident owner.';
