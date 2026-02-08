-- Migration: Create Amenities Tables
-- Date: 2026-02-05
-- Description: Creates the global amenities library and unit-specific linkage with audit tracking.

-- 1. Create Amenities Table (Global/Property Library)
CREATE TABLE public.amenities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_code TEXT NOT NULL,
    yardi_code TEXT NOT NULL,
    yardi_name TEXT NOT NULL,
    yardi_amenity TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL, -- 'Fixed', 'Premium', 'Discount'
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure uniqueness per property for the same yardi code/name/label
    CONSTRAINT unique_amenity_per_property UNIQUE (property_code, yardi_code, yardi_name, yardi_amenity)
);

CREATE INDEX idx_amenities_property ON public.amenities(property_code);
CREATE INDEX idx_amenities_active ON public.amenities(active);

-- 2. Create Unit Amenities Table (Linkage & Audit)
CREATE TABLE public.unit_amenities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
    
    -- Audit Tracking
    user_id UUID REFERENCES auth.users(id),
    comment TEXT,
    
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Partial unique index to prevent duplicate active applications of the same amenity instance.
-- We allow multiple inactive records for history, but only one active link at a time.
CREATE UNIQUE INDEX unique_unit_amenity_active ON public.unit_amenities (unit_id, amenity_id) WHERE (active = true);

CREATE INDEX idx_unit_amenities_unit ON public.unit_amenities(unit_id);
CREATE INDEX idx_unit_amenities_amenity ON public.unit_amenities(amenity_id);
CREATE INDEX idx_unit_amenities_active ON public.unit_amenities(active);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_unit_amenities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_unit_amenities_updated_at
    BEFORE UPDATE ON public.unit_amenities
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_unit_amenities_updated_at();

-- 4. Enable RLS
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_amenities ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Enable all for authenticated users" ON public.amenities
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.unit_amenities
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amenities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_amenities TO authenticated;
