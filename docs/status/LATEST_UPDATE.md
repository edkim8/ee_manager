# Field Report — 2026-02-21

## Session: Availables Audit + Color Theme System + Yardi Sync Workflow Documentation

---

## Part 1 — Availables Audit: Compare with Yardi

### Overview

Built a read-only audit tool on the `office/availabilities` page that lets a user upload the **"Available Units"** report downloaded from Yardi and compare it against the database. Zero database writes in this workflow.

---

### Files Created

#### `layers/parsing/composables/parsers/useParseAvailablesAudit.ts`
New parser for user-uploaded Availables files.

- `namePattern: '.*'` — accepts any filename (users rename downloads)
- No "Property" column — `property_code` injected by caller from `activeProperty`
- Validates by column headers, not filename; wrong file produces a clear error
- Required fields: `Unit`, `Unit Type`, `Market Rent`, `Date Available`, `Occ.` — filters blank/partial rows
- `Amenities` optional (unit may legitimately have none)
- Exports `AVAILABLES_AUDIT_REQUIRED_HEADERS` for user-facing error messages

#### `layers/ops/components/modals/AmenityComparisonModal.vue`
Full audit comparison modal.

**`ComparisonRow` interface:**
```typescript
{
  unit_name, unit_id,
  file_rent, db_rent, rent_match,
  file_date, db_date, date_match,
  file_occ, db_status, occ_match,
  db_amenities, file_amenities, missing_in_db, extra_in_db, amenity_match,
  is_full_match
}
```

**Summary bar (5 cards):**
- File Rows / Compared / Full Match / Mismatched / Not Found
- Mismatched and Not Found are split — "Issues (20)" was unclear

**Missing units banner:** Yellow alert listing unit names from file not found in DB

**Comparison table columns:**
- Unit | Matched | Market Rent (File/DB/Δ) | Date Available (File/DB) | Occ. (File/DB) | Amenity Differences

**Legend panel:** Bordered, background-colored box explaining color coding

**CSV export (20 columns with section separators):**
```
Unit | Overall
--- Rent --- | File Rent | DB Rent | Rent Result
--- Date --- | File Date | DB Date | Date Result
--- Occ. --- | File Occ. | DB Status | Occ. Result
--- Amenities --- | Missing in DB | Extra in DB | Amenity Result | DB Amenities | File Amenities
```

---

### Files Modified

#### `layers/ops/pages/office/availabilities/index.vue`

**Header buttons (top-right, same position as floor-plans):**
- **Export Sync** — opens `SyncDiscrepanciesModal` with current filtered units
- **Compare Amenities** — tooltip says "Upload the 'Available Units' report from Yardi"; triggers file picker

**Error banner:** Dismissible red banner when wrong file uploaded. Includes guidance: *"Please upload the 'Available Units' report downloaded from Yardi."*

**`handleFileUpload` — 6-step pipeline:**
1. Parse file via `useParseAvailablesAudit` (error = wrong format → show banner)
2. Inject `property_code = activeProperty.value`
3. Build unit map from already-loaded `availabilities.value` (no extra DB call)
4. Separate matched vs missing units
5. Fetch `unit_amenities` only for matched unit IDs
6. Build `ComparisonRow[]`

---

### Comparison Logic

| Field | File Source | DB Source | Match Rule |
|---|---|---|---|
| Market Rent | `Market Rent` column | `view_leasing_pipeline.rent_offered` | Delta < $0.01 |
| Date Available | `Date Available` column | `view_leasing_pipeline.available_date` | Exact ISO string |
| Occ. | `Occ.` column (raw: V, Past, Notice) | `view_leasing_pipeline.status` | Mismatch only if DB = `Applied` or `Leased` |
| Amenities | `Amenities` cell (split by `\n`, `<br>`, `,`, `;`) | `unit_amenities` table | Multi-field match: yardi_amenity OR yardi_code OR yardi_name |

**`is_full_match`** = `rentMatch && dateMatch && occMatch && amenityMatch`

**Occ. rule rationale:** Yardi "Occ." values (`V`, `Past`, `Notice`) and DB status values (`Available`, `Applied`, `Leased`) are different formats. A unit in the Availables file should be `Available` in DB — flag only if DB shows `Applied` or `Leased`.

---

### Key Design Decisions

- **No DB writes** — pure read-only audit throughout
- **No extra DB call for unit resolution** — uses `availabilities.value` already loaded on page
- **Multi-field amenity matching** — prevents false mismatches when Yardi uses a different identifier field
- **Single-property file support** — missing "Property" column auto-filled from active property

---

## Part 2 — Color Theme System

### Overview

Added a persistent 12-theme color switcher to the app, accessible from the user dropdown menu (between Dark Mode and Sign Out). Choice is saved to `localStorage` and restored on every page load.

---

### Files Created

#### `app/assets/css/main.css` (modified)
Added `@theme` block defining four custom color palettes:

| Theme | Primary | Secondary |
|---|---|---|
| Padres | Gold `#FFC425` | Brown `#2F241D` |
| DiamondBacks | Sedona Red `#A71930` | Sand `#E3D4AD` |
| Lilywhites | Navy `#132257` | — |
| Messi | Hot Pink `#EF3B5D` | Blush `#f7b5cd` |

Each palette has a full 50–950 ramp (11 shades).

#### `layers/base/composables/useTheme.ts`
Reactive theme composable with `useState` singleton.

**12 themes:**
- Default (sky), Madeline (violet)
- Padres, DiamondBacks, Lilywhites, Messi
- Blue, Indigo, Emerald, Rose, Amber, Teal

**Key implementation — custom palette injection:**
Nuxt UI v4's color plugin generates `--ui-color-primary-*` CSS variables using `var(--color-{name}-{shade}, fallback)`. For unknown names (padres, etc.) the fallback is empty and the color disappears.

Fix: for custom themes, directly set `--ui-color-primary-*` as **inline styles** on `<html>`. Inline styles sit above every `@layer` rule in the cascade and win regardless of timing.

```typescript
// For custom themes: override via inline styles
SHADES.forEach(shade => {
  root.style.setProperty(`--ui-color-primary-${shade}`, palette[shade])
})

// For built-in themes: remove overrides, let Nuxt UI handle it
SHADES.forEach(shade => {
  root.style.removeProperty(`--ui-color-primary-${shade}`)
})
```

#### `layers/base/plugins/theme.client.ts`
Client-only plugin that calls `initTheme()` on page load, restoring the saved theme before first render.

---

### Files Modified

#### `layers/base/components/AppNavigation.vue`

**Desktop (user dropdown):**
- New `Color Theme` group added between Dark Mode and Sign Out
- Custom `#theme` slot renders a compact 6×2 swatch grid (12 circles)
- Active theme: highlighted ring + scale-up
- Sports themes with two brand colors show a diagonal split circle (CSS `linear-gradient`)
- Each swatch wrapped in `UTooltip` showing the theme name on hover

**Mobile (slideover footer):**
- Same swatch row added below Width toggle, above Sign Out

---

### Critical Engineering Note — Nuxt UI v4 Color Resolution

**How Nuxt UI v4 colors work at runtime (`colors.js` plugin):**
```javascript
// For primary: 'sky' → generates working CSS
--ui-color-primary-500: var(--color-sky-500, #0ea5e9);

// For primary: 'padres' (unknown) → fallback is empty, no color applied
--ui-color-primary-500: var(--color-padres-500, "");
```

The fix (direct inline style injection) bypasses this resolution entirely. This pattern should be used any time Nuxt UI v4 needs custom color palettes at runtime that are not part of the built-in Tailwind color set.

**Reference:** `layers/base/composables/useTheme.ts` — `applyInlinePalette()` function

---

## Part 3 — Yardi Sync Workflow: Context Helper Update

### Overview

Clarified and documented the intended workflow behind **Export Sync** and **Compare Amenities** on the Availabilities page. Logic was reviewed against the Solver architecture and confirmed correct. Added a new "Yardi Sync Workflow" section to the page's `LazyContextHelper`.

### File Modified

**`layers/ops/pages/office/availabilities/index.vue`** — Context Helper only. No logic changes.

### Workflow Documented

**What Export Sync compares:**
- `rent_offered` — Yardi's Market Rent from `5p_Availables`, loaded by the daily Solver. Yardi-owned, read-only in this app.
- `calculated_offered_rent` — Our DB's calculation: Base Rent + Fixed Amenities + Temp Amenities.

**The manager workflow:**
1. Manager changes amenities in this app (Floor Plan Pricing page).
2. `calculated_offered_rent` shifts → Export Sync shows a mismatch. This mismatch IS the change list — it shows exactly what needs to be posted back to Yardi.
3. Manager posts the updated amenities in Yardi.
4. Manager uploads the fresh Yardi "Available Units" export via **Compare Amenities** to confirm all amenities match the database.
5. Export Sync stays mismatched until the **next daily Solver run** refreshes `rent_offered`. This is correct and intentional — `rent_offered` is Yardi-owned data and should not be manually overwritten.

**Decision: do not manually update `rent_offered`.**
Allowing users to write to a Yardi-sourced field risks data integrity. The one-day mismatch window is acceptable. Compare Amenities provides the interim confirmation tool.

**Summary for managers (added to Context Helper):**
> Export Sync = "what to post to Yardi." Compare Amenities = "confirm what was posted." Export Sync clears automatically on the next daily upload.
