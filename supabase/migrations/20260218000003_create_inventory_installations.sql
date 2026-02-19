-- =====================================================
-- INVENTORY INSTALLATIONS TABLE
-- Purpose: Track physical assets installed at specific locations
-- Date: 2026-02-18
-- =====================================================

-- =====================================================
-- Table: inventory_installations
-- Purpose: Physical inventory items with serial numbers and locations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Item Reference (Catalog)
    item_definition_id UUID NOT NULL REFERENCES public.inventory_item_definitions(id) ON DELETE RESTRICT,

    -- Property Scope (denormalized for fast querying)
    property_code TEXT NOT NULL REFERENCES public.properties(code) ON DELETE RESTRICT,

    -- Physical Identification
    serial_number TEXT,
    asset_tag TEXT,

    -- Installation Details
    install_date DATE,
    warranty_expiration DATE,
    purchase_price DECIMAL(10, 2),
    supplier TEXT,

    -- Location (Polymorphic)
    location_type TEXT CHECK (location_type IN ('unit', 'building', 'common_area')),
    location_id UUID,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired', 'disposed')),
    condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),

    -- Metadata
    notes TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT unique_asset_tag UNIQUE (property_code, asset_tag)
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_installations_property ON public.inventory_installations(property_code);
CREATE INDEX IF NOT EXISTS idx_installations_item_definition ON public.inventory_installations(item_definition_id);
CREATE INDEX IF NOT EXISTS idx_installations_location ON public.inventory_installations(location_type, location_id);
CREATE INDEX IF NOT EXISTS idx_installations_status ON public.inventory_installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_active ON public.inventory_installations(is_active);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.inventory_installations ENABLE ROW LEVEL SECURITY;

-- Property-scoped access
CREATE POLICY "Users can view installations for their properties"
ON public.inventory_installations FOR SELECT
TO authenticated
USING (
    property_code IN (
        SELECT p.code
        FROM public.properties p
        JOIN public.property_roles pr ON pr.property_id = p.id
        WHERE pr.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert installations for their properties"
ON public.inventory_installations FOR INSERT
TO authenticated
WITH CHECK (
    property_code IN (
        SELECT p.code
        FROM public.properties p
        JOIN public.property_roles pr ON pr.property_id = p.id
        WHERE pr.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update installations for their properties"
ON public.inventory_installations FOR UPDATE
TO authenticated
USING (
    property_code IN (
        SELECT p.code
        FROM public.properties p
        JOIN public.property_roles pr ON pr.property_id = p.id
        WHERE pr.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete installations for their properties"
ON public.inventory_installations FOR DELETE
TO authenticated
USING (
    property_code IN (
        SELECT p.code
        FROM public.properties p
        JOIN public.property_roles pr ON pr.property_id = p.id
        WHERE pr.user_id = auth.uid()
    )
);

-- =====================================================
-- Triggers: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_installations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_installations_timestamp
BEFORE UPDATE ON public.inventory_installations
FOR EACH ROW
EXECUTE FUNCTION update_installations_updated_at();

-- =====================================================
-- View: Installations with Item Details and Lifecycle
-- =====================================================
CREATE OR REPLACE VIEW public.view_inventory_installations AS
SELECT
    ii.id,
    ii.property_code,

    -- Item Definition Details
    ii.item_definition_id,
    iid.category_id,
    ic.name as category_name,
    ic.expected_life_years,
    iid.brand,
    iid.model,
    iid.manufacturer_part_number,
    iid.description as item_description,

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
        WHEN ii.location_type = 'unit' THEN (SELECT name FROM public.units WHERE id = ii.location_id)
        WHEN ii.location_type = 'building' THEN (SELECT name FROM public.buildings WHERE id = ii.location_id)
        ELSE NULL
    END as location_name,

    -- Status
    ii.status,
    ii.condition,

    -- Lifecycle Calculations
    CASE
        WHEN ii.install_date IS NOT NULL
        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE NULL
    END as age_years,

    CASE
        WHEN ii.install_date IS NOT NULL
        THEN ic.expected_life_years - EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE NULL
    END as life_remaining_years,

    CASE
        WHEN ii.install_date IS NULL THEN 'unknown'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= ic.expected_life_years THEN 'expired'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= ic.expected_life_years * 0.8 THEN 'critical'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= ic.expected_life_years * 0.6 THEN 'warning'
        ELSE 'healthy'
    END as health_status,

    -- Warranty Status
    CASE
        WHEN ii.warranty_expiration IS NULL THEN 'unknown'
        WHEN ii.warranty_expiration < CURRENT_DATE THEN 'expired'
        WHEN ii.warranty_expiration < CURRENT_DATE + INTERVAL '90 days' THEN 'expiring_soon'
        ELSE 'active'
    END as warranty_status,

    -- Metadata
    ii.notes,
    ii.is_active,
    ii.created_by,
    ii.created_at,
    ii.updated_at
FROM public.inventory_installations ii
JOIN public.inventory_item_definitions iid ON iid.id = ii.item_definition_id
JOIN public.inventory_categories ic ON ic.id = iid.category_id
WHERE ii.is_active = true;

GRANT SELECT ON public.view_inventory_installations TO authenticated;

-- =====================================================
-- Function: Get installations count for item definition
-- =====================================================
CREATE OR REPLACE FUNCTION get_installation_count(item_def_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.inventory_installations
    WHERE item_definition_id = item_def_id
    AND is_active = true;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- Function: Check if item can be deleted
-- =====================================================
CREATE OR REPLACE FUNCTION can_delete_item_definition(item_def_id UUID)
RETURNS BOOLEAN AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.inventory_installations
        WHERE item_definition_id = item_def_id
        AND is_active = true
    );
$$ LANGUAGE sql STABLE;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE public.inventory_installations IS 'Physical inventory installations at specific locations';
COMMENT ON VIEW public.view_inventory_installations IS 'Installations with item details, location info, and lifecycle calculations';
COMMENT ON FUNCTION get_installation_count(UUID) IS 'Count active installations for an item definition';
COMMENT ON FUNCTION can_delete_item_definition(UUID) IS 'Check if item definition can be safely deleted (no active installations)';
