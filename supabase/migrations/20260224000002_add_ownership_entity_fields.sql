-- Migration: Add GL codes and legal title to ownership_entities
-- Date: 2026-02-24

ALTER TABLE public.ownership_entities
    ADD COLUMN IF NOT EXISTS legal_title TEXT,
    ADD COLUMN IF NOT EXISTS distribution_gl VARCHAR(9),
    ADD COLUMN IF NOT EXISTS contribution_gl VARCHAR(9);

COMMENT ON COLUMN public.ownership_entities.legal_title IS 'Full legal name of the entity (may differ from display name)';
COMMENT ON COLUMN public.ownership_entities.distribution_gl IS 'Yardi GL account code for distributions (max 9 chars)';
COMMENT ON COLUMN public.ownership_entities.contribution_gl IS 'Yardi GL account code for contributions (max 9 chars)';
