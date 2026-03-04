-- Migration: Fix duplicate lease records + add unique constraint
-- Date: 2026-03-03
-- Problem: Repeated solver runs created multiple lease rows per (tenancy_id, start_date).
--          e.g. tenancy t3258919 (unit 1046) has 20 identical rows, all is_active=false.
--          This caused Lease History to show the same lease 20 times in the UI.
-- Root cause: Solver inserted leases without a DB-level uniqueness guard.
--             Current solver code has deduplication logic but no constraint enforces it.
-- Fix:
--   1. Delete duplicate rows, keeping the earliest-created row per (tenancy_id, start_date).
--   2. Add UNIQUE(tenancy_id, start_date) constraint to prevent future duplicates.

-- ─────────────────────────────────────────────────────────────────
-- STEP 1: Delete duplicate lease rows
-- Keep the row with the lowest created_at per (tenancy_id, start_date).
-- If created_at ties, fall back to lowest id (UUID ordering).
-- ─────────────────────────────────────────────────────────────────
DELETE FROM public.leases
WHERE id IN (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY tenancy_id, start_date
                ORDER BY created_at ASC, id ASC
            ) AS rn
        FROM public.leases
    ) ranked
    WHERE rn > 1
);

-- ─────────────────────────────────────────────────────────────────
-- STEP 2: Add unique constraint
-- A tenancy can have multiple leases (renewals) but never two leases
-- with the same start date.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.leases
    ADD CONSTRAINT leases_tenancy_id_start_date_key
    UNIQUE (tenancy_id, start_date);
