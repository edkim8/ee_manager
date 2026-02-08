-- View to provide usage statistics for each amenity in the library.
CREATE OR REPLACE VIEW public.view_amenities_usage AS
SELECT 
    a.*,
    COALESCE(ua_counts.active_count, 0) as active_units_count,
    COALESCE(ua_counts.active_count * a.amount, 0) as total_revenue_impact
FROM public.amenities a
LEFT JOIN (
    SELECT amenity_id, COUNT(*) as active_count
    FROM public.unit_amenities
    WHERE active = true
    GROUP BY amenity_id
) ua_counts ON a.id = ua_counts.amenity_id;

GRANT SELECT ON public.view_amenities_usage TO authenticated;
