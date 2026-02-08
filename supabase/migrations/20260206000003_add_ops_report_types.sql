-- Add Operational Report Types to import_report_type enum
-- Date: 2026-02-06
-- Purpose: Support Alerts, Work Orders, and Delinquencies in Unified Solver

-- Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block
-- These must be run separately

ALTER TYPE public.import_report_type ADD VALUE IF NOT EXISTS 'alerts';
ALTER TYPE public.import_report_type ADD VALUE IF NOT EXISTS 'work_orders';
ALTER TYPE public.import_report_type ADD VALUE IF NOT EXISTS 'delinquencies';
