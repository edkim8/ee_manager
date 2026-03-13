-- Add cost and vendor fields to the unified notes table.
-- Both nullable — only populated when relevant to the note.
-- Applicable to any module (installations, locations, work orders, etc.)

ALTER TABLE public.notes
  ADD COLUMN cost   NUMERIC(10, 2) NULL,
  ADD COLUMN vendor TEXT           NULL;
