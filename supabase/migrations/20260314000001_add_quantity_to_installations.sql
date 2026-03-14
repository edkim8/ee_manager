-- Add quantity field to inventory_installations
-- Default 1 — most installations are single items

ALTER TABLE public.inventory_installations
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1
    CONSTRAINT quantity_positive CHECK (quantity >= 1);

-- Recreate the view to include quantity
-- (view_inventory_summary_by_location depends on this; drop cascade and recreate both)
DROP VIEW IF EXISTS public.view_inventory_installations CASCADE;

CREATE OR REPLACE VIEW public.view_inventory_installations AS
SELECT
    ii.id,
    ii.property_code,

    -- Item Definition Details
    ii.item_definition_id,
    iid.category_id,
    ic.name                   AS category_name,
    ic.expected_life_years,
    iid.brand,
    iid.name,
    iid.manufacturer_part_number,
    iid.description           AS item_description,

    -- Installation Details
    ii.serial_number,
    ii.asset_tag,
    ii.quantity,
    ii.install_date,
    ii.warranty_expiration,
    ii.purchase_price,
    ii.supplier,

    -- Location
    ii.location_type,
    ii.location_id,
    CASE
        WHEN ii.location_type = 'unit'     THEN (SELECT u.unit_name FROM public.units     u WHERE u.id = ii.location_id)
        WHEN ii.location_type = 'building' THEN (SELECT b.name     FROM public.buildings b WHERE b.id = ii.location_id)
        ELSE NULL
    END AS location_name,

    -- Status
    ii.status,
    ii.condition,

    -- Lifecycle Calculations
    CASE
        WHEN ii.install_date IS NOT NULL
        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE NULL
    END AS age_years,

    CASE
        WHEN ii.install_date IS NOT NULL
        THEN ic.expected_life_years - EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE NULL
    END AS life_remaining_years,

    CASE
        WHEN ii.install_date IS NULL THEN 'unknown'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= ic.expected_life_years THEN 'expired'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= ic.expected_life_years * 0.8 THEN 'critical'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= ic.expected_life_years * 0.6 THEN 'warning'
        ELSE 'healthy'
    END AS health_status,

    CASE
        WHEN ii.warranty_expiration IS NULL THEN 'unknown'
        WHEN ii.warranty_expiration < CURRENT_DATE THEN 'expired'
        WHEN ii.warranty_expiration < CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
        ELSE 'active'
    END AS warranty_status,

    -- Metadata
    ii.notes,
    ii.is_active,
    ii.created_by,
    ii.created_at,
    ii.updated_at
FROM public.inventory_installations ii
JOIN public.inventory_item_definitions iid ON iid.id = ii.item_definition_id
JOIN public.inventory_categories       ic  ON ic.id  = iid.category_id
WHERE ii.is_active = true;

GRANT SELECT ON public.view_inventory_installations TO authenticated;
ALTER VIEW public.view_inventory_installations SET (security_invoker = true);

COMMENT ON VIEW public.view_inventory_installations IS
  'Installations with item definition details, lifecycle calculations, and location name.';

-- Recreate view_inventory_summary_by_location (dropped by CASCADE above)
CREATE OR REPLACE VIEW public.view_inventory_summary_by_location AS
SELECT
    location_type,
    location_id,
    property_code,
    COUNT(*)                                                  AS total_items,
    COUNT(*) FILTER (WHERE health_status = 'expired')         AS expired_count,
    COUNT(*) FILTER (WHERE health_status = 'critical')        AS critical_count,
    COUNT(*) FILTER (WHERE health_status = 'warning')         AS warning_count,
    COUNT(*) FILTER (WHERE health_status = 'healthy')         AS healthy_count,
    ROUND(AVG(age_years), 1)                                  AS avg_age_years
FROM public.view_inventory_installations
GROUP BY location_type, location_id, property_code;

GRANT SELECT ON public.view_inventory_summary_by_location TO authenticated;
ALTER VIEW public.view_inventory_summary_by_location SET (security_invoker = true);

COMMENT ON VIEW public.view_inventory_summary_by_location IS
  'Inventory health summary grouped by location (unit/building/common_area).';
