# Latest Update — H-065: Universal Unit Search (Faceted Split-Screen)

**Date:** 2026-03-02
**Branch:** feat/universal-unit-search
**Status:** Complete

---

## Summary

Added a Universal Unit Search page at `/assets/units/search` with an eCommerce-style faceted split-screen layout (reference: joesnewbalanceoutlet.com). Filter options are scoped to the **active property** and update reactively when the property switcher changes. All filtering is client-side after data loads.

---

## Files Modified

### `layers/ops/pages/assets/units/index.vue`
- Added **"Detailed Search"** button (`UButton`, `i-heroicons-funnel` icon) in the GenericDataTable `#toolbar` slot, navigating to `/assets/units/search`.

---

## Files Created

### `layers/ops/pages/assets/units/search.vue`

#### Data Fetching (5 parallel async queries, all reactive to `activeProperty`)

| Key | Source | Purpose |
|-----|--------|---------|
| `units-search-all` | `view_table_units` | All units for active property, ordered by `unit_name` |
| `units-search-amenities` | `units` → `unit_amenities` join | Two-step: fetch property unit IDs → fetch amenity linkages via `.in()` |
| `units-search-property-amenities` | `amenities` catalog | All defined amenities for the property (option lists) |
| `units-search-tenancies` | `tenancies` + `residents` join | Resident counts for Current/Notice/Eviction tenancies |
| `units-search-inventory` | `view_inventory_installations` | Installed inventory categories per unit for active property |

**Critical implementation note — amenity fetching:**
`unit_amenities` has no `property_code` column. A naive full-table fetch hits Supabase's 1000-row default limit and misses non-RS properties entirely. Fixed via a two-step query: fetch unit IDs from `units` (property-scoped), then `.in('unit_id', unitIds)` on `unit_amenities`. Both queries share the same `useAsyncData` key with `watch: [activeProperty]`.

---

#### Left Sidebar Filters (288px fixed, sticky header, scrollable body)

All sections are **collapsible** (default: all collapsed). Header shows active filter count badge, Expand All / Collapse All toggle, global text search, and the **Active Filter Chips** bar.

| Section | Filter | Type | Logic |
|---------|--------|------|-------|
| Bed / Bath | `b_b` | Checkboxes | OR — any selected match |
| Square Feet | `sf` | Radio buttons (distinct actual values) | Single exact match |
| Floor Plan | `floor_plan_marketing_name` | Checkboxes (scrollable) | OR |
| Floor Level | `floor_number` | Pill toggle buttons | OR |
| Residents | resident count (0–7+) | Pill toggle buttons | OR; 7+ = count ≥ 7 |
| Tenancy Status | `tenancy_status` | Checkboxes | OR |
| Building | `building_name` | Checkboxes (scrollable) | OR |
| Inventory | installed category names | Checkboxes | OR — unit has at least one |
| Fixed Amenities | amenity IDs | Checkboxes (scrollable) | OR within group |
| Premium Amenities | amenity IDs | Checkboxes (scrollable) | OR within group |
| Discount Amenities | amenity IDs | Checkboxes (scrollable) | OR within group |

**Between-group logic: AND** — a unit must satisfy every active section's criteria.

All option lists are derived dynamically from the fetched dataset for the active property. Inventory options auto-populate as installations are added — no hardcoding.

---

#### Active Filter Chips Bar (New Balance pattern)

- Persistent in sticky sidebar header — visible even when all sections are collapsed
- Each selected value renders as a removable pill: `label ×`
- Clicking `×` removes that single value without clearing other filters
- "Clear all" link dismisses every chip at once
- Amenity chips resolve UUID → display name via option list maps

---

#### Section Collapse Controls

- `expanded` ref keyed by section — all `false` by default
- `toggleSection(key)` — per-section toggle
- `allExpanded` computed — true only when every section is open
- `toggleAllSections()` — flips all to the inverse of `allExpanded`
- Section header shows active selection count hint, e.g. `FLOOR PLAN (2)`

---

#### Right Panel (flex-1, full-width table)

- Header: result count + "of N total" when filtered, "Back to Units" ghost button
- **GenericDataTable** — 50 rows/page, sortable, exportable, striped, clickable rows
- Columns: all standard columns from `units-complete.generated.ts` (property-role filtered)
- All cell templates match `index.vue`: unit/building/floor-plan links, tenancy badge, resident link, date formatting
- Row click → `/assets/units/[id]`

---

#### Architecture Notes

- Filter state: pure `toggleStringFilter` / `toggleNumberFilter` helpers (no array mutation)
- `unitAmenitiesMap: Map<unit_id, AmenityRow[]>` — built from property-scoped fetch, used only for filter matching
- `residentCountMap: Map<unit_id, number>` — built from tenancies with embedded `residents(id)` arrays
- `unitInventoryMap: Map<unit_id, category_name[]>` — built from inventory installations
- `buildAmenityOptions(type)` sources from catalog (`propertyAmenitiesRaw`), not linkage map
- `definePageMeta({ layout: 'dashboard' })` — SSR enabled

---

## Bugs Found and Fixed During Build

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | Amenity options missing for non-RS | Options derived from `unitAmenitiesMap` (linkage), not catalog | Sourced from `amenities` catalog table with `watch: [activeProperty]` |
| 2 | Amenity filtering returned zero for non-RS | `unitAmenitiesRaw` fetched ALL `unit_amenities` with no property filter and no `watch` — Supabase 1000-row limit + stale data | Two-step property-scoped fetch with `watch: [activeProperty]`; removed client-side `propertyUnitIds` gate |
| 3 | Amenity within-group logic was AND | `.every()` used instead of `.some()` in `filteredUnits` | Changed to `.some()` for Fixed, Premium, Discount groups |

---

## Testing Checklist

- [ ] "Detailed Search" button appears in units toolbar and navigates correctly
- [ ] All filter option lists update when active property is switched
- [ ] Bed/Bath filter shows distinct `b_b` values and filters correctly
- [ ] SF radio buttons show distinct values; selecting one filters to exact match
- [ ] Floor plan checkboxes filter correctly (OR)
- [ ] Floor level pills filter correctly (OR)
- [ ] Resident count pills: "0" = vacant, "1"–"6" exact, "7+" ≥ 7 residents
- [ ] Tenancy Status checkboxes filter correctly
- [ ] Building filter shows buildings for active property only
- [ ] Fixed / Premium / Discount Amenity filters work for ALL 5 properties (RS, SB, CV, OB, WO)
- [ ] Amenity options show all catalog amenities even if no unit has them yet
- [ ] Inventory filter auto-populates from installed data (empty state shown when none)
- [ ] Active chips appear for every selected filter, each × removes only that one
- [ ] "Clear all" resets every filter
- [ ] All sections collapse/expand; Expand All / Collapse All button works
- [ ] Sections default to collapsed on page load
- [ ] Row click routes to `/assets/units/[id]`
- [ ] "Back to Units" returns to index page
- [ ] Export downloads correctly
- [ ] Switching property clears stale filter selections (options re-derive automatically)
