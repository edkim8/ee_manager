-- Migration: Create unit_flags table for flexible flag system
-- Date: 2026-01-31
-- Purpose: Track unit issues (makeready overdue, inspections, maintenance, etc.)

-- Create unit_flags table
CREATE TABLE public.unit_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    property_code TEXT NOT NULL,
    flag_type TEXT NOT NULL,  -- 'makeready_overdue', 'inspection_pending', etc.
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Partial unique index to prevent duplicate active flags for same unit+type
CREATE UNIQUE INDEX idx_unit_flags_unique_active 
ON public.unit_flags(unit_id, flag_type) 
WHERE resolved_at IS NULL;

-- Other indexes for performance
CREATE INDEX idx_unit_flags_unit ON public.unit_flags(unit_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_unit_flags_property ON public.unit_flags(property_code) WHERE resolved_at IS NULL;
CREATE INDEX idx_unit_flags_type ON public.unit_flags(flag_type) WHERE resolved_at IS NULL;
CREATE INDEX idx_unit_flags_severity ON public.unit_flags(severity) WHERE resolved_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE public.unit_flags IS 'Flexible flag system for tracking unit issues and alerts';
COMMENT ON COLUMN public.unit_flags.flag_type IS 'Type of flag: makeready_overdue, inspection_pending, maintenance_required, etc.';
COMMENT ON COLUMN public.unit_flags.severity IS 'Urgency level: info, warning, error';
COMMENT ON COLUMN public.unit_flags.metadata IS 'Flag-specific data in JSON format (days_overdue, inspector_name, etc.)';
COMMENT ON COLUMN public.unit_flags.resolved_at IS 'When the flag was resolved (NULL = active)';
