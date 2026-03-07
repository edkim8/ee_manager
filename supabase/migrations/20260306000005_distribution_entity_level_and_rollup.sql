-- Migration: Add entity_level and rollup fields to distribution_events
-- Date: 2026-03-06
--
-- Background:
--   OB is owned 85% by SBLP (a Partnership that distributes quarterly to its 9 partners)
--   and 15% by CLL-Southborder LLC (outside client, monthly terminal recipient).
--   OB monthly distributions must go TO SBLP and CLL-Southborder directly (entity-level),
--   not through SBLP to its individual trust partners.
--   Separately, every quarter SBLP distributes its accumulated OB receipts to its 9 partners.
--
-- entity_level = TRUE  → line items go to property entities directly (OB → SBLP, CLL-Southborder)
-- source_entity_id set → rollup distribution (SBLP → its 9 trust partners)
-- rollup_event_ids     → which source events were rolled up (audit trail)

ALTER TABLE public.distribution_events
  ADD COLUMN IF NOT EXISTS entity_level      BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_entity_id  UUID     REFERENCES public.ownership_entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rollup_event_ids  UUID[]   NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.distribution_events.entity_level IS
  'TRUE = distribute TO property entities directly (e.g. OB→SBLP). '
  'FALSE = distribute through property entities to personal entity/trust partners (default).';

COMMENT ON COLUMN public.distribution_events.source_entity_id IS
  'For rollup distributions: the pass-through entity distributing to its partners (e.g. SBLP).';

COMMENT ON COLUMN public.distribution_events.rollup_event_ids IS
  'For rollup distributions: IDs of the source entity-level events being accumulated '
  '(e.g. Jan + Feb + Mar OB distribution events that SBLP collected before its Q1 payout).';
