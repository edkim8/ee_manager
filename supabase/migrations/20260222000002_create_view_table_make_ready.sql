-- View: view_table_make_ready
-- Purpose: Surface active makeready_overdue flags with unit and building context
-- for the MakeReady page (/office/make-ready).
-- Data is written by the Solver (Phase 2C) from the 5p_MakeReady report.

CREATE OR REPLACE VIEW view_table_make_ready AS
SELECT
  uf.id,
  uf.unit_id,
  COALESCE(u.unit_name, uf.metadata->>'unit_name') AS unit_name,
  uf.property_code,
  b.id   AS building_id,
  b.name AS building_name,
  uf.severity,
  (uf.metadata->>'expected_date')::date    AS expected_date,
  (uf.metadata->>'days_overdue')::integer  AS days_overdue,
  uf.message,
  uf.created_at,
  uf.resolved_at,
  (uf.resolved_at IS NULL) AS is_active
FROM public.unit_flags uf
LEFT JOIN public.units     u ON uf.unit_id    = u.id
LEFT JOIN public.buildings b ON u.building_id = b.id
WHERE uf.flag_type = 'makeready_overdue';
