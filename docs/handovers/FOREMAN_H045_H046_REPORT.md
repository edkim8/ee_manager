# Foreman Report — H-045 & H-046

**To:** Foreman
**From:** Development Team
**Date:** 2026-02-21
**Subject:** Availables Audit Tool + Color Theme System — Complete
**Status:** ✅ Production Ready

---

## Executive Summary

Two features delivered this session:

1. **H-045 — Availables Audit Tool** (`office/availabilities`)
   A read-only audit tool that lets staff upload the "Available Units" Yardi export and instantly compare it against the database — rent, date, occupancy, and amenities — with a one-click CSV export.

2. **H-046 — Color Theme System** (App-wide)
   A 12-theme color switcher in the user dropdown. Includes four branded sports themes (Padres, DiamondBacks, Lilywhites, Messi) and six standard Tailwind palettes. Persists across sessions via localStorage.

Both features are zero-risk: H-045 is entirely read-only (no DB writes), and H-046 is entirely client-side (no DB changes, no API calls).

---

## H-045: Availables Audit Tool

### What It Does

Staff download the "Available Units" report from Yardi (standard export, renamed to anything). They click **Compare Amenities** on the Availabilities page, pick the file, and within seconds see a side-by-side comparison of every unit.

### What Gets Compared

| Field | Match Rule |
|---|---|
| Market Rent | Delta < $0.01 |
| Date Available | Exact match |
| Occ. Status | Mismatch only if DB shows Applied or Leased (not Available) |
| Amenities | Matches any of: yardi_amenity, yardi_code, or yardi_name |

### What Staff See

- **5-card summary:** File Rows / Compared / Full Match / Mismatched / Not Found
- **Missing units banner:** Units in the Yardi file with no DB record (yellow alert)
- **Comparison table:** Per-unit breakdown with deltas, color coding, and amenity diff lists
- **CSV export:** 20-column output with labeled section separators for easy Excel analysis

### Design Decisions

- **No DB writes.** Pure read-only audit — nothing changes in the database.
- **No extra network call.** Uses the data already loaded on the page.
- **Wrong file → clear error.** File is validated by column headers. Uploading the wrong report shows a dismissible red banner with guidance.
- **Occ. mismatch logic.** Yardi and the DB use different status vocabularies. A unit flagged "V" (vacant) in Yardi is "Available" in the DB — that's fine. Only flag when DB shows Applied or Leased.

### Files Delivered

| File | Description |
|---|---|
| `layers/parsing/composables/parsers/useParseAvailablesAudit.ts` | New parser accepting any filename, validated by column headers |
| `layers/ops/components/modals/AmenityComparisonModal.vue` | Full comparison modal with summary, table, legend, and CSV export |
| `layers/ops/pages/office/availabilities/index.vue` | Added Export Sync + Compare Amenities buttons and upload pipeline |

---

## H-046: Color Theme System

### What It Does

Staff can pick an app color theme from the user dropdown menu (avatar → Color Theme). The choice is saved and restored automatically on every login.

### Available Themes

| Group | Themes |
|---|---|
| Default | Default (Sky blue) |
| Named | Madeline (Violet) |
| Sports | Padres (Gold/Brown) · DiamondBacks (Sedona Red/Sand) · Lilywhites (Navy) · Messi (Hot Pink/Blush) |
| Standard | Blue · Indigo · Emerald · Rose · Amber · Teal |

Sports themes with two brand colors display as split-circle swatches. Hovering any swatch shows a tooltip with the theme name.

### Engineering Note (Important for Future Developers)

Nuxt UI v4's built-in color system only recognizes Tailwind's built-in color names (sky, blue, etc.). When an unknown name like "padres" is used, it generates an empty CSS fallback and the color silently disappears.

**The fix:** For custom palettes, we bypass Nuxt UI entirely and write the `--ui-color-primary-*` CSS variables as inline styles directly on `<html>`. Inline styles beat every `@layer` stylesheet rule in the cascade, so our custom colors always win — no timing issues.

This pattern is documented in `useTheme.ts` and should be reused any time a custom color palette needs to work at runtime in Nuxt UI v4.

### Files Delivered

| File | Description |
|---|---|
| `app/assets/css/main.css` | `@theme` block defining 4 custom 11-shade color ramps |
| `layers/base/composables/useTheme.ts` | Reactive composable with `useState` singleton, inline style injection, localStorage persistence |
| `layers/base/plugins/theme.client.ts` | Client plugin that restores saved theme on page load |
| `layers/base/components/AppNavigation.vue` | Swatch grid in dropdown + mobile slideover with UTooltip labels |

---

## Risk Assessment

| Feature | Risk Level | Reason |
|---|---|---|
| Availables Audit (H-045) | **None** | Read-only, no DB writes, uses existing loaded data |
| Color Theme (H-046) | **None** | Client-side only, localStorage, no API calls |

### Rollback (if ever needed)

- H-045: Revert 3 files. No DB migration needed.
- H-046: Revert 4 files. No DB migration needed.

---

## Deployment

No special steps. Both features are bundled in the normal build. No environment variables, no DB migrations, no external services.

---

## Next Suggested Priority

The STATUS_BOARD "Next Step" note mentions content refinement using the Excel table system (column labels, widths, priorities). This is a low-risk, high-polish task that can be done incrementally per module.

---

*Report prepared: 2026-02-21*
*Both features complete, tested, and documented.*
