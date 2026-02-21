-- =====================================================
-- RECREATE MISSING INVENTORY SUMMARY VIEW
-- Purpose: Restore the summary view that was dropped in the catalog redesign
-- Date: 2026-02-20
-- =====================================================

CREATE OR REPLACE VIEW public.view_inventory_summary_by_location AS
SELECT
    location_type,
    location_id,
    property_code,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE health_status = 'expired') as expired_count,
    COUNT(*) FILTER (WHERE health_status = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE health_status = 'warning') as warning_count,
    COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_count,
    ROUND(AVG(age_years), 1) as avg_age_years
FROM public.view_inventory_installations
GROUP BY location_type, location_id, property_code;

-- Grant access to view
GRANT SELECT ON public.view_inventory_summary_by_location TO authenticated;

COMMENT ON VIEW public.view_inventory_summary_by_location IS 'Inventory health summary grouped by location (unit/building/location)';
