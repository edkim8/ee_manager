# Field Report — H-091: Color Constants Refactor + UI Upgrades
**Date:** 2026-03-14
**Shift:** Tier 2 Builder (Goldfish)
**Status:** ✅ COMPLETE — 845/845 tests passing — pushed to production

---

## Summary

Four-phase refactor eliminating the client-side color anti-pattern, upgrading the Constants Editor with live color swatches, fixing mobile Inventory navigation, and introducing shift-version tracking on the profile page.

---

## Phase 1 — Color Constants: DB as Source of Truth

**Problem:** `app_constants` stored word labels (`red`, `pink`, `yellow`, `green`, `blue`) and `availabilities/index.vue` maintained a hardcoded `colorMap` to convert them to hex. The DB was not authoritative.

**Files changed:**
| File | Action |
|---|---|
| `layers/ops/utils/colorUtils.ts` | NEW — `getColorCode(value, defaultHex)` + `isValidHex(val)` |
| `tests/unit/ops/colorUtils.test.ts` | NEW — 11 tests, all green |
| `layers/ops/pages/office/availabilities/index.vue` | Removed `colorMap` + inline `getColorCode`; imports from util |
| `supabase/migrations/20260314000002_update_color_constants_to_hex.sql` | NEW — UPDATEs all 25 color rows to hex |
| `Data/app_constants_rows.csv` | All 25 `available_status_color_*` rows updated to hex |

**Hex values (applied to all 5 properties: RS, SB, CV, OB, WO):**
| Status | Old value | New hex |
|---|---|---|
| past_due | `red` | `#F01C1C` |
| urgent | `pink` | `#F472B6` |
| approaching | `yellow` | `#FBBF24` |
| scheduled | `green` | `#34D399` |
| default | `blue` | `#60A5FA` |

Note: `past_due` was further refined from `#B91C1C` → `#F01C1C` per Foreman request.

**Migration `20260314000002` pushed to production ✅**

**Backward compatibility:** `getColorCode` falls through to `defaultHex` for any stale word values — zero crash risk.

---

## Phase 2 — ConstantsModal: Live Color Swatch + Eyedropper UX

**File:** `layers/base/components/modals/ConstantsModal.vue`

Any constant with `_color_` in its key now renders:
- Live **color swatch** (square) next to the text input, updates in real-time as hex is typed
- `font-mono` input for readability
- Helper text instructing users to enter a hex code with link to `color-hex.com`
- Swatch falls back to `#e5e7eb` (gray) for malformed/empty values — no crash
- Applies to both paired row (Theme + Rules layout) and standalone single-item constants

---

## Phase 3 — Mobile Nav: Inventory → `/office/inventory/field`

**File:** `layers/base/components/AppNavigation.vue`

Both the Operations section parent link and the Inventory child entry updated from `/office/inventory/installations` → `/office/inventory/field`.

Tapping Inventory on mobile now lands on the field hub with the 5 large tap targets (Add, Scan, Units, Buildings, Locations).

---

## Phase 4 — Version Tracking on Profile Page

**Files:** `utils/appVersion.ts` (NEW), `layers/base/pages/user/profile.vue`

- `utils/appVersion.ts` exports `APP_VERSION = 'H-091'`
- Profile page imports it directly and displays a **"Deployed Build: H-091"** badge
- No Nuxt config proxy — plain import, always resolves correctly

**To bump for future shifts:** edit `utils/appVersion.ts` → change `'H-091'` to `'H-NNN'`. One line, one file.

---

## Test Results

```
Test Files  37 passed (37)
     Tests  845 passed (845)    ← +49 vs H-090 baseline of 796
  Duration  8.55s
```

11 new `colorUtils` tests. No regressions.

---

## No Conflicts

All changes isolated. No merge conflicts with H-090 inventory work.
