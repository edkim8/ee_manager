-- Location Notes System
-- Purpose: Allow multiple notes per location with attachments
-- Architecture: 1-to-N relationship (location -> notes -> attachments)

-- =====================================================
-- Table: location_notes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.location_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'inspection',
        'repair_replacement',
        'incident',
        'maintenance',
        'update'
    )),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookup by location
CREATE INDEX IF NOT EXISTS idx_location_notes_location_id ON public.location_notes(location_id);
CREATE INDEX IF NOT EXISTS idx_location_notes_created_at ON public.location_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_notes_category ON public.location_notes(category);

-- =====================================================
-- Table: location_note_attachments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.location_note_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.location_notes(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document')),
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookup by note
CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.location_note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_file_type ON public.location_note_attachments(file_type);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.location_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_note_attachments ENABLE ROW LEVEL SECURITY;

-- Policies: location_notes
CREATE POLICY "Allow authenticated read access to notes"
ON public.location_notes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert access to notes"
ON public.location_notes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to update own notes"
ON public.location_notes
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Allow users to delete own notes"
ON public.location_notes
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Policies: location_note_attachments
CREATE POLICY "Allow authenticated read access to attachments"
ON public.location_note_attachments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert access to attachments"
ON public.location_note_attachments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow users to delete own attachments"
ON public.location_note_attachments
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- =====================================================
-- Trigger: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_location_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_notes_timestamp
BEFORE UPDATE ON public.location_notes
FOR EACH ROW
EXECUTE FUNCTION update_location_notes_updated_at();

-- =====================================================
-- View: location_notes_summary
-- =====================================================
CREATE OR REPLACE VIEW public.location_notes_summary AS
SELECT
    l.id as location_id,
    l.property_code,
    l.icon_type,
    COUNT(DISTINCT ln.id) as total_notes,
    COUNT(DISTINCT lna.id) as total_attachments,
    MAX(ln.created_at) as last_note_date,
    json_agg(
        DISTINCT jsonb_build_object(
            'category', ln.category,
            'count', (
                SELECT COUNT(*)
                FROM location_notes ln2
                WHERE ln2.location_id = l.id AND ln2.category = ln.category
            )
        )
    ) FILTER (WHERE ln.category IS NOT NULL) as category_breakdown
FROM public.locations l
LEFT JOIN public.location_notes ln ON ln.location_id = l.id
LEFT JOIN public.location_note_attachments lna ON lna.note_id = ln.id
GROUP BY l.id, l.property_code, l.icon_type;

-- Grant access to view
GRANT SELECT ON public.location_notes_summary TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.location_notes IS 'Notes attached to location markers. Supports multiple notes per location.';
COMMENT ON TABLE public.location_note_attachments IS 'File attachments (photos/documents) for location notes. Multiple files per note.';
COMMENT ON VIEW public.location_notes_summary IS 'Summary view showing note counts and latest activity per location.';
COMMENT ON COLUMN public.location_notes.category IS 'Note category: inspection, repair_replacement, incident, maintenance, update';
COMMENT ON COLUMN public.location_note_attachments.file_type IS 'File type: image (for photos) or document (for PDFs, etc.)';
