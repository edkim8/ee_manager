-- =====================================================
-- Add property_code to inventory_item_definitions
-- Purpose: Scope items to specific properties while keeping categories global
-- Date: 2026-02-18
-- =====================================================

-- Add property_code column to inventory_item_definitions
ALTER TABLE public.inventory_item_definitions
ADD COLUMN IF NOT EXISTS property_code TEXT;

-- Add foreign key constraint to properties table (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_inventory_items_property'
      AND conrelid = 'public.inventory_item_definitions'::regclass
  ) THEN
    ALTER TABLE public.inventory_item_definitions
    ADD CONSTRAINT fk_inventory_items_property
    FOREIGN KEY (property_code) REFERENCES public.properties(code)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- Create index for property_code filtering
CREATE INDEX IF NOT EXISTS idx_inventory_items_property_code
ON public.inventory_item_definitions(property_code);

-- Recreate view to include property_code
DROP VIEW IF EXISTS public.view_inventory_item_definitions;

CREATE OR REPLACE VIEW public.view_inventory_item_definitions AS
SELECT
    iid.id,
    iid.property_code,
    iid.category_id,
    ic.name as category_name,
    ic.expected_life_years,
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
     AND file_type = 'image') as photo_count,
    -- Document count
    (SELECT COUNT(*)
     FROM public.attachments
     WHERE record_id::TEXT = iid.id::TEXT
     AND record_type = 'inventory_item_definition'
     AND file_type = 'document') as document_count,
    iid.created_at,
    iid.updated_at
FROM public.inventory_item_definitions iid
JOIN public.inventory_categories ic ON ic.id = iid.category_id
WHERE iid.is_active = true;

GRANT SELECT ON public.view_inventory_item_definitions TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON COLUMN public.inventory_item_definitions.property_code IS 'Property scope - items are property-specific even if same brand/model';
COMMENT ON VIEW public.view_inventory_item_definitions IS 'Item definitions with category info, attachment counts, and property scope';
