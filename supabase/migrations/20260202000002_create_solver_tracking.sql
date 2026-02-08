-- Migration: Create Solver Run Tracking System
-- Date: 2026-02-02
-- Purpose: Track daily Solver runs and detailed events for reporting

-- =====================================================
-- solver_runs: Batch-level tracking
-- =====================================================
CREATE TABLE public.solver_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL UNIQUE,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    properties_processed TEXT[] DEFAULT '{}',
    summary JSONB DEFAULT '{}', -- High-level counts per property
    error_message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_solver_runs_batch ON public.solver_runs(batch_id);
CREATE INDEX idx_solver_runs_date ON public.solver_runs(upload_date DESC);
CREATE INDEX idx_solver_runs_status ON public.solver_runs(status);

-- =====================================================
-- solver_events: Detailed change tracking
-- =====================================================
CREATE TABLE public.solver_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solver_run_id UUID NOT NULL REFERENCES public.solver_runs(id) ON DELETE CASCADE,
    property_code TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'new_tenancy', 'new_resident', 'lease_renewal', 'notice_given', 'application_saved', 'flag_created'
    event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB NOT NULL DEFAULT '{}', -- Flexible structure per event type
    unit_id UUID REFERENCES public.units(id),
    tenancy_id TEXT REFERENCES public.tenancies(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for queries
CREATE INDEX idx_solver_events_run ON public.solver_events(solver_run_id);
CREATE INDEX idx_solver_events_type ON public.solver_events(event_type);
CREATE INDEX idx_solver_events_property ON public.solver_events(property_code);
CREATE INDEX idx_solver_events_date ON public.solver_events(event_date DESC);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE public.solver_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solver_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users"
ON public.solver_runs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users"
ON public.solver_events
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- Helpful comments
-- =====================================================
COMMENT ON TABLE public.solver_runs IS
'Tracks each daily Solver batch run with metadata and summary statistics';

COMMENT ON TABLE public.solver_events IS
'Detailed log of events during Solver processing (new tenancies, renewals, notices, etc.)';

COMMENT ON COLUMN public.solver_events.event_type IS
'Event types: new_tenancy, new_resident, lease_renewal, notice_given, application_saved, flag_created, status_auto_fix';

COMMENT ON COLUMN public.solver_events.details IS
'JSONB structure varies by event_type. Examples:
- new_tenancy: {resident_name, unit_name, move_in_date, status}
- lease_renewal: {resident_name, unit_name, old_lease: {start, end, rent}, new_lease: {start, end, rent}}
- notice_given: {resident_name, unit_name, move_in_date, move_out_date}';
