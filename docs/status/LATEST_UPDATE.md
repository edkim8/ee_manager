# Latest Update — Mobile Inventory, Barcode Scanner & UI Polish
**Date:** 2026-03-04
**Branch:** main
**Status:** Complete — ready to test on real devices

---

## Summary

Two major areas: (1) several UI polish fixes including the Vercel iPhone crash, map popup close button, mobile profile sheet, and context helper position; (2) a full mobile inventory workflow with a 3-step no-dropdown wizard and a camera-based barcode scan page tied to the Quick Scan dashboard button.

---

## Files Modified

### `nuxt.config.ts`
- `ssr: false` via `routeRules` for all authenticated routes — fixes Vercel iPhone OOM crash
- Added `build.transpile: ['@zxing/browser', '@zxing/library']`

### `layers/ops/components/map/LocationMap.vue`
- Added red circle ✕ close button to Google Maps InfoWindow HTML
- Wired `onclick → infoWindow.close()` via `setTimeout` after open

### `layers/base/components/ContextHelper.client.vue`
- Default `buttonClass` changed from `top-4 right-4` to `bottom-4 right-4`

### `layers/base/layouts/mobile-app.vue`
- Replaced "Me" nav button with "Profile" slide-up bottom sheet
- Sheet contains: property selector, dark/light toggle, color theme swatches, My Profile link, Sign Out

### `layers/base/components/AppNavigation.vue`
- Inventory parent link and child link both point to `/office/inventory/installations`

### `layers/base/pages/mobile/dashboard.vue`
- Quick Scan tile → `/mobile/scan`
- Inventory tile → `/mobile/installations`

### `layers/ops/pages/office/inventory/installations.vue`
- Left sidebar with 7 filter sections (Category, Install Date Range, Status, Health, Warranty, Condition, Location Type)
- Sidebar hidden on mobile (`hidden sm:flex`); auto-opens form on mobile mount
- All sections collapsed by default
- Active filter chips with individual dismiss
- "Item Management" button → `/office/inventory`

### `layers/base/composables/useInventoryInstallations.ts`
- Added `findByAssetTag(propertyCode, assetTag)` — returns `null` on not-found

---

## Files Created

### `layers/base/pages/mobile/installations.vue`
Mobile installation list + 3-step full-screen wizard (no dropdowns):
- **Step 1:** Item selection — search input + category-grouped tappable list
- **Step 2:** Location — Unit/Building/Common Area toggle + search + tappable list
- **Step 3:** Details — date input, 2×2 condition buttons, serial/asset tag/notes inputs
- Consistent header: back arrow (steps 2–3) + step dots + ✕ cancel always visible
- Accepts `?assetTag=` query param to pre-fill from scan page

### `layers/base/pages/mobile/scan.vue`
Full-screen Quick Scan page — 4 states:
- **scanning** — live camera with animated frame
- **looking** — spinner while querying DB by asset tag
- **found** — full installation detail card (health-color-coded, location, status, age/life, serial)
- **unknown** — "Not Registered" + Add as New Installation (→ installations with tag pre-filled)

### `layers/base/components/BarcodeScanner.client.vue`
Camera scanner using `@zxing/browser`:
- Selects rear camera automatically on mobile
- Animated scan frame: corner marks + moving scan line
- Handles camera permission denied / no camera errors
- Emits `scanned` (decoded string) and `error` (message)

---

## Architecture: Barcode Workflow

`asset_tag` (TEXT, UNIQUE per property) is the barcode value — e.g. `WO-0101`.

**Recommended process:**
1. Print batch of numbered labels at office (`WO-0001` to `WO-0050`)
2. Staff carries labels to unit, attaches to item
3. Quick Scan → scan label → if not found → Add as New Installation with tag pre-filled
4. Later: Quick Scan any label → instant detail view

→ Full detail: `docs/status/SESSION_2026_03_04_MOBILE_INVENTORY_SCANNER.md`
