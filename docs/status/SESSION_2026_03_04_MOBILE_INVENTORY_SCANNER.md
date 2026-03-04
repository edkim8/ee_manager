# Session Report — Mobile Inventory, Barcode Scanner & UI Polish
**Date:** 2026-03-04
**Branch:** `main`
**Builder:** Tier 2 (Goldfish)
**Status:** ✅ Complete — ready to test on real devices

---

## Overview

Two major areas of work this session:

1. **UI Polish** — Vercel iPhone crash fix, map popup close button, context helper position, mobile profile sheet, inventory navigation restructure
2. **Mobile Inventory + Barcode Scanner** — full mobile installation workflow with a 3-step wizard and a camera-based barcode scan page

---

## Files Modified / Created

| File | Action | Description |
|------|--------|-------------|
| `nuxt.config.ts` | Modified | SSR disabled for all authenticated routes; ZXing added to `build.transpile` |
| `layers/ops/components/map/LocationMap.vue` | Modified | Red ✕ close button on Google Maps InfoWindow popup |
| `layers/base/components/ContextHelper.client.vue` | Modified | Moved from top-right to bottom-right (`bottom-4 right-4`) |
| `layers/base/layouts/mobile-app.vue` | Modified | Replaced "Me" nav button with full Profile bottom sheet |
| `layers/base/components/AppNavigation.vue` | Modified | Inventory nav links point to `/office/inventory/installations` |
| `layers/base/pages/mobile/dashboard.vue` | Modified | Quick Scan → `/mobile/scan`; Inventory → `/mobile/installations` |
| `layers/ops/pages/office/inventory/installations.vue` | Modified | Left sidebar filters; sidebar hidden on mobile; date range filter; category filter |
| `layers/base/composables/useInventoryInstallations.ts` | Modified | Added `findByAssetTag(propertyCode, assetTag)` method |
| `layers/base/pages/mobile/installations.vue` | Created | Mobile installation list + 3-step wizard (no dropdowns) |
| `layers/base/pages/mobile/scan.vue` | Created | Full-screen barcode scan page with 4-state flow |
| `layers/base/components/BarcodeScanner.client.vue` | Created | ZXing-powered camera scanner component |

---

## Feature Detail

### 1. Vercel iPhone OOM Fix

**Root cause:** All authenticated routes were SSR-enabled. The dashboard SSR-rendered 7+ data-heavy widgets simultaneously, pushing the V8 heap to ~1.8 GB before crashing with `FATAL ERROR: Ineffective mark-compacts near heap limit`.

**Fix:** `ssr: false` via `routeRules` in `nuxt.config.ts` for all authenticated routes. SSR retained only for `/auth/**`.

**Rule going forward:** Never enable SSR on authenticated pages. Only `/auth/**` keeps SSR.

---

### 2. Location Map Popup — Close Button

Added a red circle ✕ button to the Google Maps InfoWindow HTML. Wired via `document.getElementById` in the `setTimeout` after `infoWindow.open()`.

---

### 3. Context Helper — Position Fix

Changed `ContextHelper.client.vue` default `buttonClass` from `top-4 right-4` to `bottom-4 right-4`. It was colliding with the hamburger menu on mobile.

---

### 4. Mobile Profile Bottom Sheet

Replaced the "Me" nav button in `mobile-app.vue` with a "Profile" button that opens a slide-up bottom sheet containing:
- User name + department/role
- Property selector (`USelectMenu`)
- Dark/Light mode toggle
- Color theme swatch grid (6 columns)
- My Profile link
- Sign Out button

Uses `<Transition>` for backdrop + sheet slide animations with safe-area-inset padding.

---

### 5. Office Installations Page (`/office/inventory/installations`)

Restructured as the primary inventory landing page (previously `/office/inventory`).

**Sidebar filters (tablet/desktop only, hidden on mobile `sm:hidden`):**
- Text search (filters brand, model, serial, asset tag, location, category)
- Category (always visible; "No categories available" when empty)
- Installation Date Range (From / To date inputs)
- Status, Health, Warranty, Condition, Location Type
- All sections collapsed by default
- Active filter chips with individual ×-dismiss
- Clear all button

**Mobile behavior:** Sidebar hidden (`hidden sm:flex`). Form auto-opens on mount when `window.innerWidth < 640`.

**Item Management button** links back to `/office/inventory` for catalog management.

---

### 6. `/mobile/installations` — Mobile Installation List + Wizard

#### List view
- Simple cards: brand/model, category, location, install date, health badge, serial/asset tag
- Fixed "Add Installation" button above bottom nav (`bottom: calc(env(safe-area-inset-bottom) + 6.5rem)`)

#### 3-Step Wizard (full-screen slide-up, no dropdowns anywhere)

**Step 1 — Select Item**
- Search input filters by brand, model, category
- Items grouped under sticky category headers
- Large tappable rows (64px) with chevron

**Step 2 — Select Location**
- Selected item summary banner at top
- 3 large toggle buttons: Unit / Building / Common Area
- Search input + large tappable location rows
- Bug fixed: `v-for="(label, type) in {...}"` — Vue object iteration is `(value, key)`, was swapped

**Step 3 — Details**
- Summary card showing chosen item + location
- Install date (full-width date input)
- Condition: 2×2 color-coded buttons (Excellent/Good/Fair/Poor) — no dropdown
- Serial #, Asset Tag, Notes — full-width generous inputs (text-base)
- Save button

**Header (consistent across all steps):**
- Left: Back arrow (steps 2–3) / spacer (step 1)
- Center: step title + "Step N of 3"
- Right: Step dots + ✕ Cancel always visible

**Query param integration:** When arriving from scan page with `?assetTag=WO-0001`, wizard auto-opens with asset tag pre-filled.

---

### 7. Barcode Scanner System

#### Asset Tag as Barcode Identifier

`asset_tag` (`TEXT`, `UNIQUE (property_code, asset_tag)`) is the barcode value. Format: `{PROPERTY}-{SEQUENCE}` e.g. `WO-0101`, `RS-0042`. The `serial_number` field holds the manufacturer serial and is not used as a barcode.

#### `findByAssetTag(propertyCode, assetTag)`

Added to `useInventoryInstallations`. Queries `view_inventory_installations` by `(property_code, asset_tag)`. Returns `null` on `PGRST116` (not found) instead of throwing — expected case for new labels.

#### `BarcodeScanner.client.vue`

- Uses `@zxing/browser` `BrowserMultiFormatReader`
- Selects rear camera by label (`back`/`rear`/`environment` keywords, else last device)
- Animated scan frame: corner marks + moving scan line (`@keyframes scan`)
- Vignette overlay via `mask-image` radial gradient
- Handles `NotAllowedError` (camera denied) and `NotFoundError` (no camera) with clear error messages
- `NotFoundException` (no barcode in frame) is silently ignored — fires every frame
- Exposes `startScanner()` / `stopScanner()` for parent control
- Cleans up on `onUnmounted`

#### `/mobile/scan` — Quick Scan Page

4-state flow: `scanning → looking → found | unknown | error`

| State | UI |
|-------|----|
| `scanning` | Live camera + animated frame + supported formats hint |
| `looking` | Spinner + scanned tag text (camera paused) |
| `found` | Full installation detail card — health color-coded, location, status, age/life left, serial, notes |
| `unknown` | "Not Registered" + **Add as New Installation** (→ `/mobile/installations?assetTag=…`) + Scan Again |
| `error` | Error message + Try Again |

Supported formats: Code 128, Code 39, EAN-13, QR Code, Data Matrix (all via ZXing multi-format reader).

---

## Recommended Installation Workflow

**Pre-print batch labels approach (one-trip, most efficient):**

1. Office generates a batch of asset tags (`WO-0001` to `WO-0050`) and prints barcode labels.
2. Maintenance staff carries label sheet to the unit.
3. At the unit: attach label to the item.
4. Tap **Quick Scan** → scan the label just attached.
5. App finds no record → shows "Not Registered" → tap **Add as New Installation**.
6. Wizard opens with `assetTag` pre-filled → complete item, location, details → Save.
7. Done in one visit.

**Later, for lookups:**
- Tap Quick Scan → scan any label → installation detail appears immediately.

---

## Dependencies Added

```
@zxing/browser
@zxing/library
```

Added to `build.transpile` in `nuxt.config.ts`.

---

## Testing Checklist

### Vercel / iPhone
- [ ] App loads on iPhone without crash
- [ ] Cold start from iPhone works
- [ ] All authenticated pages render client-side (no SSR data fetching)

### Location Map
- [ ] Click map marker → info window opens
- [ ] Red ✕ button closes the info window

### Mobile Profile Sheet
- [ ] "Profile" button opens bottom sheet
- [ ] Property selector works
- [ ] Dark/light toggle works
- [ ] Color theme changes work
- [ ] My Profile link navigates correctly
- [ ] Sign Out clears session

### Office Installations (`/office/inventory/installations`)
- [ ] Sidebar shows on tablet/desktop, hidden on mobile
- [ ] Category filter always visible (shows "No categories available" if empty)
- [ ] Date range filter works (From / To)
- [ ] All sections start collapsed
- [ ] Active filter chips appear and each × dismisses correctly
- [ ] "Item Management" button links to `/office/inventory`

### Mobile Installations (`/mobile/installations`)
- [ ] Installation list loads and displays correctly
- [ ] "Add Installation" button appears above bottom nav
- [ ] Step 1: search filters items by brand/model/category
- [ ] Step 1: items grouped by category headers
- [ ] Step 2: Unit/Building/Common Area toggle switches location list
- [ ] Step 2: search filters location list
- [ ] Step 3: Condition buttons are color-coded and selectable
- [ ] Step 3: Asset tag pre-filled when arriving from scan page
- [ ] Cancel ✕ closes wizard from any step
- [ ] Back arrow navigates to previous step
- [ ] Save creates installation and refreshes list

### Quick Scan (`/mobile/scan`)
- [ ] Camera opens automatically on iOS Safari and Android Chrome
- [ ] Scan frame animation visible
- [ ] Scanning an existing asset tag shows full detail card
- [ ] Scanning an unknown asset tag shows "Not Registered" message
- [ ] "Add as New Installation" pre-fills asset tag in wizard
- [ ] "Scan Another" restarts camera
- [ ] Camera denied error shows clear message
