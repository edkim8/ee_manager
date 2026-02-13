-- Fix pipeline summary periods to use renewal processing logic
-- Renewals are processed 60-89 days before expiration
-- "Next Period" = First of next month + 2 months (current renewal processing period)
-- "Next 3 Periods" = First of next month + 2 months through first of next month + 4 months

CREATE OR REPLACE VIEW public.view_renewal_pipeline_summary AS
SELECT
    l.property_code,
    fp.id AS floor_plan_id,
    fp.marketing_name AS floor_plan_name,

    -- Current Renewal Period (Next 30 Days):
    -- First of next month + 2 months = current renewal processing period
    -- Example: Today Feb 12 → Next first = Mar 1 → Add 2 months → May 1-31
    -- This represents leases expiring in the period being currently processed
    COUNT(DISTINCT l.id) FILTER (
        WHERE l.end_date >= DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '2 months'
        AND l.end_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '3 months'
        AND l.is_active = true
    ) AS expiring_30_days,

    -- Next 3 Renewal Periods (Next 90 Days):
    -- From current renewal period through 2 more periods
    -- Example: Today Feb 12 → May 1 through July 31 (3 months of renewal periods)
    COUNT(DISTINCT l.id) FILTER (
        WHERE l.end_date >= DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '2 months'
        AND l.end_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '5 months'
        AND l.is_active = true
    ) AS expiring_90_days,

    -- Current rent stats for active leases in this floor plan
    MIN(l.rent_amount) FILTER (WHERE l.is_active = true) AS current_rent_min,
    ROUND(AVG(l.rent_amount) FILTER (WHERE l.is_active = true), 2) AS current_rent_avg,
    MAX(l.rent_amount) FILTER (WHERE l.is_active = true) AS current_rent_max,

    -- Count of renewals by status (from worksheet items)
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'offered' AND rwi.active = true) AS offered_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'manually_accepted' AND rwi.active = true) AS manually_accepted_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'manually_declined' AND rwi.active = true) AS manually_declined_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'accepted' AND rwi.active = true) AS accepted_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'declined' AND rwi.active = true) AS declined_count,
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.status = 'pending' AND rwi.active = true) AS pending_count,

    -- Yardi confirmed count
    COUNT(DISTINCT rwi.id) FILTER (WHERE rwi.yardi_confirmed = true AND rwi.active = true) AS yardi_confirmed_count

FROM public.leases l
JOIN public.tenancies t ON l.tenancy_id = t.id
JOIN public.units u ON t.unit_id = u.id
LEFT JOIN public.floor_plans fp ON u.floor_plan_id = fp.id
LEFT JOIN public.renewal_worksheet_items rwi ON t.id = rwi.tenancy_id AND rwi.active = true
WHERE l.lease_status IN ('Current', 'Notice')
GROUP BY l.property_code, fp.id, fp.marketing_name;

COMMENT ON VIEW public.view_renewal_pipeline_summary IS 'Dashboard view showing renewal pipeline by floor plan. Periods aligned with 60-89 day advance processing: "Next Period" = leases expiring in current renewal processing period (first of next month + 2 months).';
