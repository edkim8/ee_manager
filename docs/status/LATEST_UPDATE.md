# Field Report — H-090 (cont.): Mobile Field Hub
**Date:** 2026-03-14
**Builder:** Tier 2 (Goldfish)
**Session:** H-090 (continued)

---

## Summary

Built the mobile Field Hub at `/office/inventory/field` — a fully self-contained, stack-navigated page for field staff using phones or iPads. No sub-routes needed; all navigation is internal state. 834 unit tests green.

---

## Phase 5: Mobile Field Hub (`/office/inventory/field`)

### Hub Screen
Five large tap targets arranged in a 2×2 + full-width grid:
- **Add** (blue) — opens inline add-installation form
- **Scan** (purple) — opens rear camera with `BarcodeDetector` API + manual text fallback
- **Unit** (green) — Unit list → Installation list → Detail
- **Building** (orange) — Building list → Installation list → Detail
- **Locations** (teal, full width) — Location category list → Location list → Installation list → Detail

### Navigation
Stack-based (`ref<StackFrame[]>`) — `push()`, `pop()`, `goHub()`.
- Back chevron in header pops one frame.
- "Hub" breadcrumb jumps to root and stops camera stream.
- `viewTitle` computed resolves the current screen's label from the top frame's data.

### Scan Branch
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` — rear camera
- `BarcodeDetector` detect loop via `requestAnimationFrame`; gracefully disabled when API unavailable
- Manual asset-tag text input always visible below camera view (e.g. `SB-000042`)
- `findByAssetTag(propertyCode, tag)` — looks up matching installation; shows error if not found
- On match → `fetchInstallationWithDetails(id)` → push `installation-detail`

### Location Branch — Category Grouping
`useLocationSelector.fetchLocations` only returns `{ id, name, type }` — no `location_type`.
Field hub queries `locations` table directly: `select('id, description, location_type')` to build
grouped category pills: Electrical, Plumbing, HVAC, Structural, General/Other.

### Installation Detail Screen (shared across all branches)
Lean summary card: item name, location name, asset tag, install date, health status, notes.
NuxtLink out to the parent unit/building/location's admin page (explicit break from linear flow).

Fixed bottom bar for all detail screens:
- **Edit** — slides in the full add/edit form (same form used by Add branch); after save, detail refreshes via `fetchInstallationWithDetails`
- **Transfer** — bottom sheet (Teleport to body); picks new location type + location via `LocationSelector`; calls `updateInstallation` with only `{ location_type, location_id }` delta
- **Delete** — bottom sheet (Teleport to body); confirmation required; calls `deleteInstallation` (soft delete, sets `is_active = false`); pops stack after

### Add Form
- Category filter pills narrow item options before passing to `LocationSelector`
- Asset tag field marked **Optional** with helper text (skip for LEDs, bulk items)
- Location type selector + `LocationSelector` for location
- Standard fields: serial number, install date, condition, notes

### Entry Point
Added **Field Mode** button to the header of `installations.vue` (desktop page), linking to `/office/inventory/field`.

---

## NuxtImg Ban — Enforcement
- `docs/governance/ASSET_PROTOCOLS.md` rewritten to **V2.0** — `<NuxtImg>` and `<NuxtPicture>` explicitly prohibited
- Reason: iPhone/Safari rendering failures for field staff
- Memory entry created: `feedback_no_nuxtimg.md`
- `inventory/index.vue` photo viewer corrected to native `<img loading="lazy" @error="...">`

---

## Tests

| File | Tests | Status |
|------|-------|--------|
| `tests/unit/ops/inventoryContextFilter.test.ts` | 12 | ✅ |
| Full suite (`tests/unit`) | 834 | ✅ |

---

## Files Changed

| File | Change |
|------|--------|
| `layers/ops/pages/office/inventory/field.vue` | New — full mobile field hub |
| `layers/ops/pages/office/inventory/installations.vue` | Field Mode button; context filter; category pills; asset tag UX; Transfer modal |
| `layers/ops/pages/office/inventory/index.vue` | Photo viewer modal (native img) |
| `layers/ops/pages/assets/units/index.vue` | Manage Installations wrench icon per row |
| `layers/ops/pages/assets/buildings/index.vue` | Manage Installations wrench icon per row |
| `docs/governance/ASSET_PROTOCOLS.md` | V2.0 — NuxtImg ban |
| `tests/unit/ops/inventoryContextFilter.test.ts` | New (12 tests) |

---

## Outstanding / Not Implemented

- **Locations page** contextual link: `locations/index.vue` uses a non-`GenericDataTable` card layout — deferred to a follow-up when that page's structure is mapped.
- **QR scan on iOS Safari**: `BarcodeDetector` API not available on iOS Safari — manual entry fallback is the primary path on iPhone until a cross-platform library is chosen.
- **Quantity field for bulk items**: No `quantity` column on `inventory_installations` — needs migration + form field in a dedicated session.
