-- ─────────────────────────────────────────────────────────────────────────────
-- Consolidate notes into a single polymorphic `notes` table (Option 2.5)
-- • Creates `note_category_configs` (DB-stored, admin-editable category lists)
-- • Creates unified `notes` table (record_id + record_type polymorphic pattern)
-- • Migrates location_notes  → notes (record_type = 'location')
-- • Migrates inventory_notes → notes (record_type = 'installation')
-- • Migrates *_note_attachments → attachments (record_type = 'note')
-- • Drops location_notes_summary view, all four legacy tables
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. note_category_configs ──────────────────────────────────────────────────
CREATE TABLE public.note_category_configs (
  record_type  TEXT        PRIMARY KEY,
  categories   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID        REFERENCES auth.users(id)
);

ALTER TABLE public.note_category_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read note_category_configs"
  ON public.note_category_configs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage note_category_configs"
  ON public.note_category_configs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed: location categories (matches existing hardcoded list)
-- Seed: installation categories (matches existing hardcoded list)
INSERT INTO public.note_category_configs (record_type, categories) VALUES
  ('location',     '["inspection","repair_replacement","incident","maintenance","update"]'::jsonb),
  ('installation', '["general","service","repair","inspection","warranty_claim"]'::jsonb);

-- ── 2. Unified notes table ────────────────────────────────────────────────────
CREATE TABLE public.notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id    UUID        NOT NULL,
  record_type  TEXT        NOT NULL,
  note_text    TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'general',
  created_by   UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index mirrors the (record_type, record_id) lookup pattern
CREATE INDEX idx_notes_record     ON public.notes (record_type, record_id);
CREATE INDEX idx_notes_created_at ON public.notes (created_at DESC);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notes"
  ON public.notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert notes"
  ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creators and admins can update notes"
  ON public.notes FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Creators and admins can delete notes"
  ON public.notes FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- ── 3. Migrate location_notes → notes ────────────────────────────────────────
-- Preserve the original UUIDs so that any in-flight UI state still resolves
INSERT INTO public.notes
  (id, record_id, record_type, note_text, category, created_by, created_at, updated_at)
SELECT
  id, location_id, 'location', note_text, category, created_by, created_at, updated_at
FROM public.location_notes;

-- ── 4. Migrate inventory_notes → notes ───────────────────────────────────────
INSERT INTO public.notes
  (id, record_id, record_type, note_text, category, created_by, created_at, updated_at)
SELECT
  id, installation_id, 'installation', note_text, category, created_by, created_at, updated_at
FROM public.inventory_notes;

-- ── 5. Migrate location_note_attachments → attachments ───────────────────────
-- note_id becomes record_id; record_type = 'note' aligns with useAttachments pattern
INSERT INTO public.attachments
  (record_id, record_type, file_url, file_type, file_name, file_size, mime_type, uploaded_by, uploaded_at)
SELECT
  note_id, 'note', file_url, file_type, file_name, file_size, mime_type, uploaded_by, uploaded_at
FROM public.location_note_attachments;

-- ── 6. Migrate inventory_note_attachments → attachments ──────────────────────
INSERT INTO public.attachments
  (record_id, record_type, file_url, file_type, file_name, file_size, mime_type, uploaded_by, uploaded_at)
SELECT
  note_id, 'note', file_url, file_type,
  COALESCE(file_name, 'attachment'),  -- inventory table allowed NULL file_name
  file_size, mime_type, uploaded_by, uploaded_at
FROM public.inventory_note_attachments;

-- ── 7. Drop legacy views and tables ──────────────────────────────────────────
-- View must go before the table it references
DROP VIEW  IF EXISTS public.location_notes_summary;

-- Attachment tables (FK to note tables) must go before note tables
DROP TABLE IF EXISTS public.location_note_attachments;
DROP TABLE IF EXISTS public.inventory_note_attachments;

-- Note tables
DROP TABLE IF EXISTS public.location_notes;
DROP TABLE IF EXISTS public.inventory_notes;
