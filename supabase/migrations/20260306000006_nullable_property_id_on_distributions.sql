-- Migration: Make property_id nullable on distribution_events
-- Date: 2026-03-06
-- Reason: Entity distributions (e.g. SBLP quarterly) are not tied to a single property.
--   They originate from a pass-through entity (source_entity_id) that has its own
--   distribution cadence and amount independent of any property event.

ALTER TABLE public.distribution_events
  ALTER COLUMN property_id DROP NOT NULL;
