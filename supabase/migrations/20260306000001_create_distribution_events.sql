-- Migration: Distribution Events System
-- Date: 2026-03-06
-- Description: Proper distribution tracking with event header + per-owner line items.
--   Supports CA Form 592 withholding tracking for non-resident owners (CV only, 7%).

-- ─── 0. Add withhold_pct to owner_profile_mapping ────────────────────────────
-- Source of truth for each owner's withholding rate. Set to 7 for CV non-resident
-- owners (GL 33015-000 and 33006-000). All other mappings stay at 0.
-- Snapshotted onto each distribution_line_item at event creation — historical
-- records remain immutable even if the rate changes later.
ALTER TABLE public.owner_profile_mapping
  ADD COLUMN IF NOT EXISTS withhold_pct NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (withhold_pct >= 0 AND withhold_pct <= 100);

-- ─── 1. distribution_events (one per distribution batch) ─────────────────────
CREATE TABLE IF NOT EXISTS public.distribution_events (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID    NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  title             TEXT    NOT NULL,
  distribution_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  total_amount      NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
  type              TEXT    CHECK (type IN ('Operating', 'Refinance', 'Sale', 'Tax')),
  status            TEXT    NOT NULL DEFAULT 'Draft'
                              CHECK (status IN ('Draft', 'Processing', 'Complete')),
  notes             TEXT,
  created_by        UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER distribution_events_updated_at
  BEFORE UPDATE ON public.distribution_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_distribution_events_property ON public.distribution_events(property_id);
CREATE INDEX IF NOT EXISTS idx_distribution_events_date     ON public.distribution_events(distribution_date DESC);

-- ─── 2. distribution_line_items (one per owner per event) ────────────────────
-- Equity chain is resolved and snapshotted at event creation time.
-- gross_amount = total_amount × equity_pct / 100
-- withhold_amount = gross_amount × withhold_pct / 100
-- net_amount = gross_amount − withhold_amount
CREATE TABLE IF NOT EXISTS public.distribution_line_items (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           UUID    NOT NULL REFERENCES public.distribution_events(id) ON DELETE CASCADE,

  -- Who (snapshot at event creation)
  profile_id         UUID    REFERENCES public.profiles(id)           ON DELETE SET NULL,
  owner_entity_id    UUID    REFERENCES public.ownership_entities(id)  ON DELETE SET NULL,
  owner_name         TEXT    NOT NULL,

  -- Financial snapshot
  equity_pct         NUMERIC(8, 4) NOT NULL,   -- effective % of property (full chain)
  gross_amount       NUMERIC(15, 2) NOT NULL,
  withhold_pct       NUMERIC(5, 2) NOT NULL DEFAULT 0,
  withhold_amount    NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net_amount         NUMERIC(15, 2) NOT NULL,
  distribution_gl    TEXT,

  -- Transfer tracking
  transfer_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  transfer_date      DATE,
  transfer_notes     TEXT,

  sort_order         INT     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER distribution_line_items_updated_at
  BEFORE UPDATE ON public.distribution_line_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_dist_line_items_event   ON public.distribution_line_items(event_id);
CREATE INDEX IF NOT EXISTS idx_dist_line_items_profile ON public.distribution_line_items(profile_id);

-- ─── 3. RLS — distribution_events ────────────────────────────────────────────
ALTER TABLE public.distribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distribution_events_admin_all"
  ON public.distribution_events FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "distribution_events_owner_read"
  ON public.distribution_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.distribution_line_items
      WHERE event_id = distribution_events.id AND profile_id = auth.uid()
    )
  );

-- ─── 4. RLS — distribution_line_items ────────────────────────────────────────
ALTER TABLE public.distribution_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distribution_line_items_admin_all"
  ON public.distribution_line_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_super_admin = TRUE)
  );

CREATE POLICY "distribution_line_items_owner_read"
  ON public.distribution_line_items FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
