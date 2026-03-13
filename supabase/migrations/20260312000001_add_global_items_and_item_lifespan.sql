-- =====================================================
-- Inventory: Global Catalog Items & Item-Specific Lifespans
-- Date: 2026-03-12
-- Changes:
--   1. Add nullable expected_life_years to inventory_item_definitions
--      (overrides category lifespan when set; falls back to category when NULL)
--   2. Drop the FK constraint on property_code so 'ALL' can be stored
--      (items with property_code = 'ALL' are visible at every property)
--   3. Recreate view with COALESCE lifespan fallback and both raw columns exposed
-- =====================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add item-specific expected_life_years column (nullable override)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.inventory_item_definitions
ADD COLUMN IF NOT EXISTS expected_life_years INTEGER;

COMMENT ON COLUMN public.inventory_item_definitions.expected_life_years IS
  'Item-specific lifespan override (years). When set, takes precedence over the category default. When NULL, the view falls back to inventory_categories.expected_life_years.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop the FK constraint on property_code to allow 'ALL'
--    The column remains TEXT — valid values are a 2-char property code or 'ALL'.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_inventory_items_property'
      AND conrelid = 'public.inventory_item_definitions'::regclass
  ) THEN
    ALTER TABLE public.inventory_item_definitions
    DROP CONSTRAINT fk_inventory_items_property;
  END IF;
END $$;

COMMENT ON COLUMN public.inventory_item_definitions.property_code IS
  'Property scope. Use a 2-char property code (e.g. SB, CV, WO) or ''ALL'' for items shared across every property. NULL means unscoped (legacy — treat as ALL).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Recreate view with lifespan fallback and global property support
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.view_inventory_item_definitions;

CREATE OR REPLACE VIEW public.view_inventory_item_definitions AS
SELECT
    iid.id,
    iid.property_code,
    iid.category_id,
    ic.name                                                        AS category_name,
    -- Effective lifespan: item-level override wins; falls back to category
    COALESCE(iid.expected_life_years, ic.expected_life_years)      AS expected_life_years,
    -- Raw values exposed so the UI can show "Using category default (X yrs)"
    iid.expected_life_years                                        AS item_expected_life_years,
    ic.expected_life_years                                         AS category_expected_life_years,
    iid.brand,
    iid.model,
    iid.manufacturer_part_number,
    iid.description,
    iid.notes,
    iid.is_active,
    -- Photo count
    (SELECT COUNT(*)
     FROM public.attachments
     WHERE record_id::TEXT = iid.id::TEXT
       AND record_type = 'inventory_item_definition'
       AND file_type = 'image')                                    AS photo_count,
    -- Document count
    (SELECT COUNT(*)
     FROM public.attachments
     WHERE record_id::TEXT = iid.id::TEXT
       AND record_type = 'inventory_item_definition'
       AND file_type = 'document')                                 AS document_count,
    iid.created_at,
    iid.updated_at
FROM public.inventory_item_definitions iid
JOIN public.inventory_categories ic ON ic.id = iid.category_id
WHERE iid.is_active = true;

GRANT SELECT ON public.view_inventory_item_definitions TO authenticated;

-- Re-apply security invoker (required after DROP/CREATE)
ALTER VIEW public.view_inventory_item_definitions SET (security_invoker = true);

COMMENT ON VIEW public.view_inventory_item_definitions IS
  'Item definitions with category info, attachment counts, effective lifespan (COALESCE item > category), and property scope (property code or ALL).';
