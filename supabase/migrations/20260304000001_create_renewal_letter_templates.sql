-- renewal_letter_templates
-- Stores per-property configuration for renewal offer letters:
--   - Community display name, manager name/phone (used in letter body and PDF)
--   - Supabase Storage URLs for the property letterhead image and DOCX template
--
-- One row per property. Upserted by the admin UI.
-- Falls back gracefully to static /public/ files when no DB record exists.

CREATE TABLE IF NOT EXISTS public.renewal_letter_templates (
  property_code     TEXT        PRIMARY KEY,
  community_name    TEXT        NOT NULL DEFAULT '',
  manager_name      TEXT        NOT NULL DEFAULT '',
  manager_phone     TEXT        NOT NULL DEFAULT '',
  letterhead_url    TEXT,       -- Supabase Storage public URL for letterhead image
  docx_template_url TEXT,       -- Supabase Storage public URL for DOCX template
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with known RS data (matches the current reference file)
INSERT INTO public.renewal_letter_templates (property_code, community_name, manager_name, manager_phone)
VALUES
  ('RS', 'Residences at 4225', 'Community Manager', '602.795.2790'),
  ('SB', 'Stonebridge Apartments', 'Community Manager', ''),
  ('OB', 'Ocean Breeze Apartments', 'Community Manager', ''),
  ('CV', 'City View Apartments', 'Community Manager', ''),
  ('WO', 'Whispering Oaks Apartments', 'Community Manager', '')
ON CONFLICT (property_code) DO NOTHING;

-- RLS: any authenticated user can read (needed server-side for PDF generation)
ALTER TABLE public.renewal_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read renewal_letter_templates"
  ON public.renewal_letter_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can modify renewal_letter_templates"
  ON public.renewal_letter_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_super_admin = TRUE
    )
  );

COMMENT ON TABLE public.renewal_letter_templates IS
  'Per-property configuration for renewal offer letters (community name, manager, letterhead image, DOCX template).';
