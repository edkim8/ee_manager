-- =====================================================
-- Rename inventory_item_definitions.model → name
-- Date: 2026-03-12
-- Reason: "Name" is more descriptive than "Model" for catalog items,
--         since not all items have an official model number.
--         manufacturer_part_number (MPN) is retained for the official part ref.
-- =====================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Rename the column on the base table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_item_definitions
RENAME COLUMN model TO name;

COMMENT ON COLUMN public.inventory_item_definitions.name IS
  'Descriptive item name (e.g. "French Door Refrigerator"). More flexible than a model number; use manufacturer_part_number for the official MPN.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Recreate view_inventory_item_definitions
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.view_inventory_item_definitions;

CREATE OR REPLACE VIEW public.view_inventory_item_definitions AS
SELECT
    iid.id,
    iid.property_code,
    iid.category_id,
    ic.name                                                        AS category_name,
    COALESCE(iid.expected_life_years, ic.expected_life_years)      AS expected_life_years,
    iid.expected_life_years                                        AS item_expected_life_years,
    ic.expected_life_years                                         AS category_expected_life_years,
    iid.brand,
    iid.name,
    iid.manufacturer_part_number,
    iid.description,
    iid.notes,
    iid.is_active,
    (SELECT COUNT(*)
     FROM public.attachments
     WHERE record_id::TEXT = iid.id::TEXT
       AND record_type = 'inventory_item_definition'
       AND file_type = 'image')  AS photo_count,
    (SELECT COUNT(*)
     FROM public.attachments
     WHERE record_id::TEXT = iid.id::TEXT
       AND record_type = 'inventory_item_definition'
       AND file_type = 'document') AS document_count,
    iid.created_at,
    iid.updated_at
FROM public.inventory_item_definitions iid
JOIN public.inventory_categories ic ON ic.id = iid.category_id
WHERE iid.is_active = true;

GRANT SELECT ON public.view_inventory_item_definitions TO authenticated;
ALTER VIEW public.view_inventory_item_definitions SET (security_invoker = true);

COMMENT ON VIEW public.view_inventory_item_definitions IS
  'Item definitions with category info, attachment counts, effective lifespan, and property scope.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Recreate view_inventory_installations (joins iid.name instead of iid.model)
-- ─────────────────────────────────────────────────────────────────────────────
-- view_inventory_summary_by_location depends on this view; drop cascade, recreate both below
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Recreate view_inventory_summary_by_location (was dropped by CASCADE above)
-- ─────────────────────────────────────────────────────────────────────────────
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
