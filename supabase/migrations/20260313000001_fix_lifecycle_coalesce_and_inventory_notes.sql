-- =====================================================
-- 1. Fix view_inventory_installations lifecycle calculations
--    Use COALESCE(iid.expected_life_years, ic.expected_life_years) so
--    item-level lifespan overrides feed the health/age CASE statements.
-- 2. Create inventory_notes + inventory_note_attachments tables
--    following the same pattern as location_notes.
-- Date: 2026-03-13
-- =====================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: Recreate view_inventory_installations with COALESCE lifespan
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.view_inventory_installations CASCADE;

CREATE OR REPLACE VIEW public.view_inventory_installations AS
SELECT
    ii.id,
    ii.property_code,

    -- Item Definition Details
    ii.item_definition_id,
    iid.category_id,
    ic.name                                                           AS category_name,
    -- Effective lifespan (item-level override wins over category default)
    COALESCE(iid.expected_life_years, ic.expected_life_years)         AS expected_life_years,
    iid.brand,
    iid.name,
    iid.manufacturer_part_number,
    iid.description                                                   AS item_description,

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
        WHEN ii.location_type = 'unit'     THEN (SELECT u.unit_name FROM public.units     u WHERE u.id = ii.location_id)
        WHEN ii.location_type = 'building' THEN (SELECT b.name     FROM public.buildings b WHERE b.id = ii.location_id)
        ELSE NULL
    END                                                               AS location_name,

    -- Status
    ii.status,
    ii.condition,

    -- Lifecycle — all four calcs use the same effective lifespan
    CASE
        WHEN ii.install_date IS NOT NULL
        THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE NULL
    END                                                               AS age_years,

    CASE
        WHEN ii.install_date IS NOT NULL
        THEN COALESCE(iid.expected_life_years, ic.expected_life_years)
             - EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))::INTEGER
        ELSE NULL
    END                                                               AS life_remaining_years,

    CASE
        WHEN ii.install_date IS NULL THEN 'unknown'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))
             >= COALESCE(iid.expected_life_years, ic.expected_life_years)       THEN 'expired'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))
             >= COALESCE(iid.expected_life_years, ic.expected_life_years) * 0.8 THEN 'critical'
        WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, ii.install_date))
             >= COALESCE(iid.expected_life_years, ic.expected_life_years) * 0.6 THEN 'warning'
        ELSE 'healthy'
    END                                                               AS health_status,

    CASE
        WHEN ii.warranty_expiration IS NULL                                          THEN 'unknown'
        WHEN ii.warranty_expiration < CURRENT_DATE                                   THEN 'expired'
        WHEN ii.warranty_expiration < CURRENT_DATE + INTERVAL '90 days'             THEN 'expiring_soon'
        ELSE 'active'
    END                                                               AS warranty_status,

    -- Metadata
    ii.notes,
    ii.is_active,
    ii.created_by,
    ii.created_at,
    ii.updated_at
FROM public.inventory_installations ii
JOIN public.inventory_item_definitions iid ON iid.id = ii.item_definition_id
JOIN public.inventory_categories       ic  ON ic.id  = iid.category_id
WHERE ii.is_active = true;

GRANT SELECT ON public.view_inventory_installations TO authenticated;
ALTER VIEW public.view_inventory_installations SET (security_invoker = true);

COMMENT ON VIEW public.view_inventory_installations IS
  'Installations with item definition details, lifecycle calculations (using item-level lifespan override), and location name.';


-- Recreate summary view that was cascade-dropped above
CREATE OR REPLACE VIEW public.view_inventory_summary_by_location AS
SELECT
    location_type,
    location_id,
    property_code,
    COUNT(*)                                                  AS total_items,
    COUNT(*) FILTER (WHERE health_status = 'expired')         AS expired_count,
    COUNT(*) FILTER (WHERE health_status = 'critical')        AS critical_count,
    COUNT(*) FILTER (WHERE health_status = 'warning')         AS warning_count,
    COUNT(*) FILTER (WHERE health_status = 'healthy')         AS healthy_count,
    ROUND(AVG(age_years), 1)                                  AS avg_age_years
FROM public.view_inventory_installations
GROUP BY location_type, location_id, property_code;

GRANT SELECT ON public.view_inventory_summary_by_location TO authenticated;
ALTER VIEW public.view_inventory_summary_by_location SET (security_invoker = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: inventory_notes table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES public.inventory_installations(id) ON DELETE CASCADE,
    note_text       TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general'
                    CHECK (category IN ('service', 'repair', 'inspection', 'warranty_claim', 'general')),
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_notes_installation ON public.inventory_notes(installation_id);

ALTER TABLE public.inventory_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_inventory_notes"   ON public.inventory_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_inventory_notes" ON public.inventory_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_inventory_notes" ON public.inventory_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "authenticated_delete_inventory_notes" ON public.inventory_notes FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION update_inventory_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_notes_updated_at
BEFORE UPDATE ON public.inventory_notes
FOR EACH ROW EXECUTE FUNCTION update_inventory_notes_updated_at();

COMMENT ON TABLE public.inventory_notes IS
  'Service/maintenance notes attached to a physical installation. Mirrors location_notes pattern.';


-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: inventory_note_attachments table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_note_attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id     UUID NOT NULL REFERENCES public.inventory_notes(id) ON DELETE CASCADE,
    file_url    TEXT NOT NULL,
    file_type   TEXT NOT NULL CHECK (file_type IN ('image', 'document')),
    file_name   TEXT NOT NULL,
    file_size   BIGINT,
    mime_type   TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_note_attachments_note ON public.inventory_note_attachments(note_id);

ALTER TABLE public.inventory_note_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_inv_note_att"   ON public.inventory_note_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_inv_note_att" ON public.inventory_note_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_delete_inv_note_att" ON public.inventory_note_attachments FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.inventory_note_attachments IS
  'File attachments for inventory_notes (photos, invoices, service records).';
