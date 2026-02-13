-- Enhance view_renewal_worksheet_summaries with detailed breakdowns
-- Adds rent source breakdown (LTL, Max, Manual) and status breakdown by renewal type

DROP VIEW IF EXISTS public.view_renewal_worksheet_summaries;

CREATE OR REPLACE VIEW public.view_renewal_worksheet_summaries AS
SELECT
    rw.id AS worksheet_id,
    rw.property_code,
    rw.name,
    rw.status,
    rw.start_date,
    rw.end_date,
    rw.ltl_percent,
    rw.max_rent_increase_percent,
    rw.mtm_fee,
    rw.is_fully_approved,
    rw.created_at,
    rw.updated_at,

    -- Total Counts
    COUNT(rwi.id) FILTER (WHERE rwi.active = true) AS total_items,

    -- ========== STANDARD RENEWALS ==========

    -- Total Standard Count
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.active = true) AS standard_total,

    -- Standard by Rent Source
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'ltl_percent' AND rwi.active = true) AS standard_ltl_count,
    SUM(rwi.final_rent) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'ltl_percent' AND rwi.active = true) AS standard_ltl_total,
    SUM(rwi.current_rent) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'ltl_percent' AND rwi.active = true) AS standard_ltl_current,

    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'max_percent' AND rwi.active = true) AS standard_max_count,
    SUM(rwi.final_rent) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'max_percent' AND rwi.active = true) AS standard_max_total,
    SUM(rwi.current_rent) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'max_percent' AND rwi.active = true) AS standard_max_current,

    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'manual' AND rwi.active = true) AS standard_manual_count,
    SUM(rwi.final_rent) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'manual' AND rwi.active = true) AS standard_manual_total,
    SUM(rwi.current_rent) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.rent_offer_source = 'manual' AND rwi.active = true) AS standard_manual_current,

    -- Standard by Status
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.status = 'pending' AND rwi.active = true) AS standard_pending_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.status = 'offered' AND rwi.active = true) AS standard_offered_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.status = 'manually_accepted' AND rwi.active = true) AS standard_manually_accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.status = 'manually_declined' AND rwi.active = true) AS standard_manually_declined_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.status = 'accepted' AND rwi.active = true) AS standard_accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'standard' AND rwi.status = 'declined' AND rwi.active = true) AS standard_declined_count,

    -- ========== MTM RENEWALS ==========

    -- Total MTM Count
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.active = true) AS mtm_total,

    -- MTM Financial Summary
    SUM(rwi.final_rent) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.active = true) AS mtm_total_rent,
    SUM(rwi.current_rent) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.active = true) AS mtm_current_rent,

    -- MTM by Status
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.status = 'pending' AND rwi.active = true) AS mtm_pending_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.status = 'offered' AND rwi.active = true) AS mtm_offered_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.status = 'manually_accepted' AND rwi.active = true) AS mtm_manually_accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.status = 'manually_declined' AND rwi.active = true) AS mtm_manually_declined_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.status = 'accepted' AND rwi.active = true) AS mtm_accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.renewal_type = 'mtm' AND rwi.status = 'declined' AND rwi.active = true) AS mtm_declined_count,

    -- ========== GLOBAL STATS ==========

    -- Overall Status Counts (all types)
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'pending' AND rwi.active = true) AS pending_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'offered' AND rwi.active = true) AS offered_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'manually_accepted' AND rwi.active = true) AS manually_accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'manually_declined' AND rwi.active = true) AS manually_declined_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'accepted' AND rwi.active = true) AS accepted_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'declined' AND rwi.active = true) AS declined_count,
    COUNT(rwi.id) FILTER (WHERE rwi.status = 'expired' AND rwi.active = true) AS expired_count,

    -- Yardi Confirmation Count
    COUNT(rwi.id) FILTER (WHERE rwi.yardi_confirmed = true AND rwi.active = true) AS yardi_confirmed_count,

    -- Approval Count
    COUNT(rwi.id) FILTER (WHERE rwi.approved = true AND rwi.active = true) AS approved_count,

    -- Overall Financial Summary
    SUM(rwi.current_rent) FILTER (WHERE rwi.active = true) AS total_current_rent,
    SUM(rwi.final_rent) FILTER (WHERE rwi.active = true) AS total_offered_rent,
    SUM(rwi.final_rent - rwi.current_rent) FILTER (WHERE rwi.active = true) AS total_rent_increase,

    -- Average Increase %
    CASE
        WHEN SUM(rwi.current_rent) FILTER (WHERE rwi.active = true) > 0 THEN
            ROUND(
                (SUM(rwi.final_rent - rwi.current_rent) FILTER (WHERE rwi.active = true) /
                 SUM(rwi.current_rent) FILTER (WHERE rwi.active = true)) * 100,
                2
            )
        ELSE 0
    END AS avg_increase_percent

FROM public.renewal_worksheets rw
LEFT JOIN public.renewal_worksheet_items rwi ON rw.id = rwi.worksheet_id
GROUP BY rw.id;

COMMENT ON VIEW public.view_renewal_worksheet_summaries IS 'Enhanced worksheet summaries with detailed breakdowns by rent source (LTL, Max, Manual) and status for both Standard and MTM renewals.';
