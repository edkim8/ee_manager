-- =====================================================
-- INVENTORY LIFE-CYCLE SYSTEM V4.0
-- Purpose: Track property assets (appliances, flooring) across Units, Buildings, and GIS Locations
-- Architecture: Polymorphic location support + Event ledger + Uses existing attachments infrastructure
-- =====================================================

-- =====================================================
-- Table: inventory_categories
-- Purpose: Define asset types with expected lifespan for budgeting
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    expected_life_years INTEGER NOT NULL CHECK (expected_life_years > 0),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for active category lookup
CREATE INDEX IF NOT EXISTS idx_inventory_categories_active ON public.inventory_categories(is_active, name);

-- =====================================================
-- Table: inventory_items
-- Purpose: Physical asset instances with polymorphic location tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Category & Metadata
    category_id UUID NOT NULL REFERENCES public.inventory_categories(id) ON DELETE RESTRICT,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    seller TEXT,
    install_date DATE,

    -- Polymorphic Location
    -- Supports: 'unit' | 'building' | 'location' (GIS markers)
    location_type TEXT NOT NULL CHECK (location_type IN ('unit', 'building', 'location')),
    location_id UUID NOT NULL,

    -- Property Scoping (denormalized for fast filtering)
    property_code TEXT NOT NULL,

    -- Status
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'retired', 'replaced')),
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Notes
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_property ON public.inventory_items(property_code, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON public.inventory_items(location_type, location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(status, is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_install_date ON public.inventory_items(install_date DESC);

-- Composite index for reverse search: "Find all items in this unit/building/location"
CREATE INDEX IF NOT EXISTS idx_inventory_items_polymorphic_location ON public.inventory_items(location_type, location_id, is_active);

-- =====================================================
-- Table: inventory_history
-- Purpose: Event ledger for tracking Install, Refinish, Replacement events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,

    -- Event details
    event_type TEXT NOT NULL CHECK (event_type IN ('install', 'refinish', 'replace', 'repair', 'retire')),
    event_date DATE NOT NULL,

    -- Event metadata
    description TEXT,
    cost NUMERIC(10, 2), -- Optional cost tracking
    vendor TEXT,

    -- Visual proof (optional attachment reference)
    -- NOTE: References existing attachments table with record_type='inventory_history'
    attachment_id UUID REFERENCES public.attachments(id) ON DELETE SET NULL,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for event tracking
CREATE INDEX IF NOT EXISTS idx_inventory_history_item_id ON public.inventory_history(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_history_event_type ON public.inventory_history(event_type);
CREATE INDEX IF NOT EXISTS idx_inventory_history_event_date ON public.inventory_history(event_date DESC);

-- =====================================================
-- NOTE: Photo Storage
-- Photos for inventory items use the EXISTING attachments table:
-- - record_type = 'inventory_item'
-- - record_id = inventory_items.id
-- - Uses existing useAttachments() composable with auto-compression
-- - Stores in existing 'images' bucket (public read)
-- =====================================================

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- Policies: inventory_categories
CREATE POLICY "Allow authenticated read access to categories"
ON public.inventory_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert access to categories"
ON public.inventory_categories FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to categories"
ON public.inventory_categories FOR UPDATE
TO authenticated
USING (true);

-- Policies: inventory_items
CREATE POLICY "Allow authenticated read access to items"
ON public.inventory_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert access to items"
ON public.inventory_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update access to items"
ON public.inventory_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated delete access to items"
ON public.inventory_items FOR DELETE
TO authenticated
USING (true);

-- Policies: inventory_history
CREATE POLICY "Allow authenticated read access to history"
ON public.inventory_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert access to history"
ON public.inventory_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- Triggers: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_categories_timestamp
BEFORE UPDATE ON public.inventory_categories
FOR EACH ROW
EXECUTE FUNCTION update_inventory_updated_at();

CREATE TRIGGER trigger_update_inventory_items_timestamp
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION update_inventory_updated_at();

-- =====================================================
-- View: inventory_items_with_lifecycle
-- Purpose: Calculate age, life remaining, and health status for budgeting
-- =====================================================
CREATE OR REPLACE VIEW public.view_inventory_lifecycle AS
SELECT
    ii.id,
    ii.category_id,
    ic.name as category_name,
    ic.expected_life_years,
    ii.brand,
    ii.model,
    ii.serial_number,
    ii.seller,
    ii.install_date,
    ii.location_type,
    ii.location_id,
    ii.property_code,
    ii.status,
    ii.notes,

    -- Lifecycle calculations
    CASE
        WHEN ii.install_date IS NOT NULL THEN
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE NULL
    END as age_years,

    CASE
        WHEN ii.install_date IS NOT NULL THEN
            ic.expected_life_years - EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE ic.expected_life_years
    END as life_remaining_years,

    -- Health status (for visual indicators)
    CASE
        WHEN ii.install_date IS NULL THEN 'unknown'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= ic.expected_life_years THEN 'expired'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= (ic.expected_life_years * 0.8) THEN 'critical'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date)) >= (ic.expected_life_years * 0.6) THEN 'warning'
        ELSE 'healthy'
    END as health_status,

    -- Photo count (from attachments table)
    (SELECT COUNT(*)
     FROM public.attachments
     WHERE record_id::TEXT = ii.id::TEXT
     AND record_type = 'inventory_item'
     AND file_type = 'image') as photo_count,

    -- Last event
    (SELECT event_type FROM public.inventory_history WHERE item_id = ii.id ORDER BY event_date DESC LIMIT 1) as last_event_type,
    (SELECT event_date FROM public.inventory_history WHERE item_id = ii.id ORDER BY event_date DESC LIMIT 1) as last_event_date,

    -- Audit
    ii.created_at,
    ii.updated_at
FROM public.inventory_items ii
JOIN public.inventory_categories ic ON ic.id = ii.category_id
WHERE ii.is_active = true;

-- Grant access to view
GRANT SELECT ON public.view_inventory_lifecycle TO authenticated;

-- =====================================================
-- View: inventory_summary_by_location
-- Purpose: Show item counts and health breakdown per location
-- =====================================================
CREATE OR REPLACE VIEW public.view_inventory_summary_by_location AS
SELECT
    location_type,
    location_id,
    property_code,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE health_status = 'expired') as expired_count,
    COUNT(*) FILTER (WHERE health_status = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE health_status = 'warning') as warning_count,
    COUNT(*) FILTER (WHERE health_status = 'healthy') as healthy_count,
    ROUND(AVG(age_years), 1) as avg_age_years
FROM public.view_inventory_lifecycle
GROUP BY location_type, location_id, property_code;

-- Grant access to view
GRANT SELECT ON public.view_inventory_summary_by_location TO authenticated;

-- =====================================================
-- Seed Data: Default Categories
-- =====================================================
INSERT INTO public.inventory_categories (name, description, expected_life_years) VALUES
('Refrigerator', 'Kitchen refrigerator/freezer units', 12),
('Stove', 'Kitchen cooking range/oven', 15),
('Dishwasher', 'Kitchen dishwasher', 10),
('Microwave', 'Kitchen microwave oven', 8),
('Washer', 'Laundry washing machine', 10),
('Dryer', 'Laundry dryer', 13),
('HVAC Unit', 'Heating, ventilation, and air conditioning system', 15),
('Water Heater', 'Hot water heater', 10),
('Carpet', 'Floor carpeting', 7),
('Vinyl Flooring', 'Vinyl plank or tile flooring', 15),
('Hardwood Flooring', 'Hardwood floor', 25),
('Tile Flooring', 'Ceramic or porcelain tile', 20),
('Countertops', 'Kitchen or bathroom countertops', 15),
('Cabinets', 'Kitchen or bathroom cabinetry', 20),
('Light Fixture', 'Ceiling or wall-mounted light fixtures', 10),
('Ceiling Fan', 'Ceiling-mounted fan', 12),
('Smoke Detector', 'Fire safety smoke detector', 10),
('Carbon Monoxide Detector', 'CO detector', 7),
('Thermostat', 'HVAC thermostat', 10),
('Garbage Disposal', 'Kitchen sink garbage disposal unit', 12)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.inventory_categories IS 'Asset categories with expected lifespan for budgeting and replacement planning';
COMMENT ON TABLE public.inventory_items IS 'Physical asset instances with polymorphic location support (unit|building|location). Photos stored in attachments table with record_type=inventory_item';
COMMENT ON TABLE public.inventory_history IS 'Event ledger for tracking install, refinish, replace, repair, and retire events. Visual proof via attachment_id reference';

COMMENT ON COLUMN public.inventory_items.location_type IS 'Polymorphic location type: unit | building | location';
COMMENT ON COLUMN public.inventory_items.location_id IS 'UUID reference to units.id, buildings.id, or locations.id based on location_type';
COMMENT ON COLUMN public.inventory_history.event_type IS 'Event type: install | refinish | replace | repair | retire';
COMMENT ON COLUMN public.inventory_history.attachment_id IS 'Optional reference to attachments table for visual proof of event';

COMMENT ON VIEW public.view_inventory_lifecycle IS 'Inventory items with calculated age, life remaining, and health status for budgeting';
COMMENT ON VIEW public.view_inventory_summary_by_location IS 'Inventory health summary grouped by location (unit/building/location)';
