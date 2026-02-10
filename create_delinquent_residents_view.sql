-- Manual execution: Create View for Delinquent Residents Table
-- Run this in Supabase SQL Editor if migration fails

CREATE OR REPLACE VIEW public.view_table_delinquent_residents AS
SELECT
    d.id,
    d.property_code,
    d.tenancy_id,
    d.unit_id,
    d.unit_name,
    d.resident,
    d.total_unpaid,
    d.days_0_30,
    d.days_31_60,
    d.days_61_90,
    d.days_90_plus,
    d.prepays,
    d.balance,
    d.created_at,
    -- Resident details
    r.id as resident_id,
    r.email as resident_email,
    r.phone as resident_phone,
    -- Unit details
    u.id as unit_detail_id,
    u.floor_plan_id,
    -- Building details
    b.id as building_id,
    b.name as building_name,
    -- Tenancy details
    t.status as tenancy_status,
    t.move_in_date,
    t.move_out_date
FROM
    public.delinquencies d
LEFT JOIN public.tenancies t ON d.tenancy_id = t.id
LEFT JOIN public.residents r ON t.id = r.tenancy_id AND r.role = 'Primary'
LEFT JOIN public.units u ON d.unit_id = u.id
LEFT JOIN public.buildings b ON u.building_id = b.id
WHERE
    d.is_active = true
    AND d.total_unpaid > 0
ORDER BY
    d.total_unpaid DESC;

-- Grant permissions
GRANT SELECT ON public.view_table_delinquent_residents TO authenticated, anon, service_role;
