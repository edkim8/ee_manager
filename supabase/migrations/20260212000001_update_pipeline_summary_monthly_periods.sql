-- Update view_renewal_pipeline_summary to use monthly periods instead of rolling days
-- Business Logic: Align with monthly processing (1st to last day of month)
-- - Next 30 Days → Next Month (from 1st to last day)
-- - Next 90 Days → Next 3 Months (from 1st of next month to last day of 3rd month)

CREATE OR REPLACE VIEW public.view_renewal_pipeline_summary AS
SELECT
    l.property_code,
    fp.id AS floor_plan_id,
    fp.marketing_name AS floor_plan_name,

    -- Next Month: First day of next month to last day of next month
    -- Example: If today is Feb 12, this counts leases expiring Mar 1-31
    COUNT(DISTINCT l.id) FILTER (
        WHERE l.end_date >= DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
        AND l.end_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '2 months')
        AND l.is_active = true
    ) AS expiring_30_days,

    -- Next 3 Months: First day of next month to last day of 3rd month from now
    -- Example: If today is Feb 12, this counts leases expiring Mar 1 - May 31
    COUNT(DISTINCT l.id) FILTER (
        WHERE l.end_date >= DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
        AND l.end_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '4 months')
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

COMMENT ON VIEW public.view_renewal_pipeline_summary IS 'Dashboard view showing renewal pipeline by floor plan: expiration counts (next month and next 3 months), rent stats, status breakdown (manual + Yardi-confirmed). Uses monthly periods aligned with business processing (1st to last day of month).';
