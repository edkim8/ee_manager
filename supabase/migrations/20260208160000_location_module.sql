-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude FLOAT8 NOT NULL,
    longitude FLOAT8 NOT NULL,
    icon_type TEXT CHECK (icon_type IN (
        'electrical', 
        'plumbing', 
        'hvac',
        'structural', 
        'lighting', 
        'safety_fire',
        'landscaping',
        'pavement_parking',
        'waste',
        'incident',
        'general'
    )),
    source_image_url TEXT,
    description TEXT,
    property_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID DEFAULT auth.uid()
);

-- Enable Row Level Security
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Policy: Public Read (Authenticated users can read all locations)
CREATE POLICY "Allow authenticated read access" ON public.locations
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Auth Insert (Users can insert their own locations)
CREATE POLICY "Allow authenticated insert access" ON public.locations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Auth Delete (Users can delete locations)
CREATE POLICY "Allow authenticated delete access" ON public.locations
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy: Auth Update (Users can update locations)
CREATE POLICY "Allow authenticated update access" ON public.locations
    FOR UPDATE
    TO authenticated
    USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_property_code ON public.locations(property_code);
