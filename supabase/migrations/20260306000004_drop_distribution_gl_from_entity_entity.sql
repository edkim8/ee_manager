-- Migration: Drop distribution_gl from entity_entity_ownership
-- Date: 2026-03-06
-- Reason: distribution_gl already exists on ownership_entities (migration 20260224000002)
--   as the canonical single source of truth per entity. Adding it to entity_entity_ownership
--   was redundant. The distribution POST route now reads it from ownership_entities directly.

ALTER TABLE public.entity_entity_ownership
  DROP COLUMN IF EXISTS distribution_gl;
