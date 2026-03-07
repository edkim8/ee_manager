-- Migration: Add entity_level_distribution flag to properties
-- Date: 2026-03-06
-- Reason: OB is owned by two pass-through entities (SBLP 85%, CLL-Southborder 15%)
--   that manage their own downstream distribution cadences independently.
--   OB distributions must always go TO those entities, never through them to partners.
--   This flag auto-applies entity_level=true when creating distributions for this property.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS entity_level_distribution BOOLEAN NOT NULL DEFAULT FALSE;

-- OB is the only property using entity-level distributions
UPDATE public.properties SET entity_level_distribution = TRUE WHERE code = 'OB';
