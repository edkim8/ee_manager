# Spec: Amenities Audit & Color Theme System (H-045 & H-046)

## H-045: Availables Audit Tool
A read-only audit tool on the `office/availabilities` page that allows users to upload the "Available Units" report from Yardi and compare it against the database.

### Architectural Decisions
- **Read-Only**: No database writes (CRUD) are allowed.
- **Header Validation**: Files are validated by column headers (`Unit`, `Market Rent`, etc.) rather than filename.
- **Context Injection**: Since single-property reports lack property codes, the `activeProperty` context is injected.
- **Multi-Field Matching**: Amenities are matched against `yardi_amenity`, `yardi_code`, or `yardi_name` to prevent false mismatches.

### Component Map
- `layers/parsing/composables/parsers/useParseAvailablesAudit.ts`: Custom parser logic.
- `layers/ops/components/modals/AmenityComparisonModal.vue`: Comparison UI with Side-by-Side Diff, Summary Cards, and CSV Export.
- `layers/ops/pages/office/availabilities/index.vue`: UI mount point and file handling pipeline.

---

## H-046: Color Theme System
A persistent 12-theme color switcher accessible from the user dropdown.

### Technical Implementation
- **V4 Color Resolution**: Nuxt UI v4 fails to resolve custom color names (e.g., "padres") from the `@theme` block into CSS variables.
- **Inline Style Injection**: Custom themes are applied by injecting `--ui-color-primary-*` variables as inline styles on the `<html>` element to override the cascade.
- **Persistence**: Theme choice is saved to `localStorage` and restored via `theme.client.ts` plugin.

---

## Technical Session Log (Crystallized from LATEST_UPDATE.md)

### Part 1 — Availables Audit: Compare with Yardi
(LATEST_UPDATE content from 2026-02-21 appended here...)
- Comparison Logic: Market Rent (Delta < $0.01), Date Available (Exact), Occ. Status (Mismatch only if DB is Applied/Leased).
- CSV export includes 20 columns with section separators.

### Part 2 — Color Theme System
- Themes: Sky, Violet, Padres, DiamondBacks, Lilywhites, Messi, Blue, Indigo, Emerald, Rose, Amber, Teal.
- Sports themes use `linear-gradient` for split-circle swatches.

### Part 3 — Yardi Sync Workflow
1. App Update → Export Sync (Action List).
2. Yardi Posting.
3. Compare Amenities (Interim Confirmation).
4. Daily Solver Run (Final Baseline Refresh).
