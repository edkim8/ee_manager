-- =====================================================
-- INVENTORY SYSTEM REDESIGN - Catalog Pattern
-- Purpose: Separate item definitions (catalog) from physical installations
-- Date: 2026-02-18
-- =====================================================

-- =====================================================
-- Drop old tables if they exist
-- =====================================================
DROP TABLE IF EXISTS public.inventory_history CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP VIEW IF EXISTS public.view_inventory_lifecycle CASCADE;
DROP VIEW IF EXISTS public.view_inventory_summary_by_location CASCADE;

-- inventory_categories table stays the same (already correct)

-- =====================================================
-- Table: inventory_item_definitions (Master Catalog)
-- Purpose: Define types of items (brand, model) - created ONCE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_item_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Category
    category_id UUID NOT NULL REFERENCES public.inventory_categories(id) ON DELETE RESTRICT,

    -- Item Identification
    brand TEXT,
    model TEXT,
    manufacturer_part_number TEXT,
    description TEXT,

    -- Metadata
    notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_item_definitions_category ON public.inventory_item_definitions(category_id);
CREATE INDEX IF NOT EXISTS idx_item_definitions_active ON public.inventory_item_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_item_definitions_brand_model ON public.inventory_item_definitions(brand, model);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.inventory_item_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access to item definitions"
ON public.inventory_item_definitions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert access to item definitions"
ON public.inventory_item_definitions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to item definitions"
ON public.inventory_item_definitions FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated delete access to item definitions"
ON public.inventory_item_definitions FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Triggers: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_item_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_item_definitions_timestamp
BEFORE UPDATE ON public.inventory_item_definitions
FOR EACH ROW
EXECUTE FUNCTION update_item_definitions_updated_at();

-- =====================================================
-- View: Item Definitions with Category Info
-- =====================================================
CREATE OR REPLACE VIEW public.view_inventory_item_definitions AS
SELECT
    iid.id,
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
COMMENT ON TABLE public.inventory_item_definitions IS 'Master catalog of item types (brand/model). One record per type, many physical installations reference it.';
COMMENT ON VIEW public.view_inventory_item_definitions IS 'Item definitions with category info and attachment counts';

-- =====================================================
-- NOTE: Physical Installations Table
-- To be added in future migration when ready to track installations
-- Will include: item_definition_id, serial_number, install_date, location, etc.
-- =====================================================
