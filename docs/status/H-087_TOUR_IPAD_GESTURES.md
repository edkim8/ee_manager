# H-087: Tour Companion — iPad Gesture System & Presentation Polish

**Date:** 2026-03-13
**Commits:** `ecb3b55` (initial build) · `cbad319` (gesture simplification)
**Branch:** main → production (Vercel auto-deploy)
**Files changed:** 5 (`UnitDossier.vue`, `installations.vue`, `inventory/index.vue`, `LocationNotesModal.vue`, `LocationPicker.vue`)

---

## Revision — Gesture Simplification (`cbad319`)

After real-device review, the gesture system was simplified to avoid conflicts with native iPadOS functions:

**Removed:**
- **2-finger swipe ← →** (unit navigation) — reserved for native pinch-to-zoom; letting the OS handle it is always safer
- **4-finger swipe ↑/↓** (enter/exit Presentation Mode) — intercepted by iPadOS app-switcher before reaching the web layer; use the existing ↙/↗ button instead
- **3-finger ↑** (hide tab bar) — merged into a single toggle gesture

**Changed:**
- **3-finger ↓** is now a **toggle** — one gesture shows or hides the tab bar, same direction both ways

**Added:**
- **Auto-reveal tab bar** when navigating to the Neighborhood page in Presentation Mode: the Google Maps iframe captures all touch events, making 3-finger gestures impossible from inside it. The tab bar now appears automatically so the user always has the button-based navigation available.

**Final gesture map:**

| Fingers | Direction | Action |
|---|---|---|
| **1** | ← → | Prev / Next photo (gallery only) |
| **3** | ← → | Prev / Next dossier page |
| **3** | ↓ | Toggle tab bar on / off |
| 2 | — | Reserved — native pinch-to-zoom |
| 4 | — | Reserved — iPadOS system (app switcher, home) |

**Google Maps iframe limitation (by design):** Cross-origin iframes never dispatch touch events to the parent page — this is a browser security rule, not a bug. No workaround exists that preserves map interactivity. Auto-reveal is the correct solution.

---

## Overview

Full upgrade of the Tour Companion iPad App (`/tour/dashboard`) with a native-feeling 5-tier touch gesture system, full-canvas Presentation Mode, and correct image sizing across the application. No new database migrations. Zero test regressions (796 tests passing).

---

## Phase 1 — Image Sizing Fixes (app-wide)

**Problem:** Photos in fixed-height containers were using `object-cover`, which crops/stretches images that don't match the container's aspect ratio. On iPad this was especially visible in the tour hero photo and inventory detail views.

**Rule applied:** "Main display photos" → `object-contain` (full image visible, letterboxed). "Small thumbnails" → keep `object-cover` (too small for letterboxing to look good).

| File | Element | Change |
|---|---|---|
| `layers/base/components/tour/UnitDossier.vue` | Hero gallery image | `object-cover` → `object-contain` |
| `layers/ops/pages/office/inventory/installations.vue` | Primary h-48 installation photo | `object-cover` → `object-contain` |
| `layers/ops/pages/office/inventory/index.vue` | Item card panel photo (w-28) | `object-cover` → `object-contain` |
| `layers/ops/components/location/LocationNotesModal.vue` | Note attachment photos | `object-cover` → `object-contain` |
| `layers/ops/components/map/LocationPicker.vue` | Location photo preview (h-32) | `object-cover` → `object-contain` |

Thumbnail grids (72×56 px, h-20 grids) were intentionally left as `object-cover`.

The hero photo container already has `bg-black` when photos are present, so `object-contain` gives a premium letterbox/pillarbox appearance on iPad — the full photo is always visible with black bars filling any gap.

---

## Phase 2 — Photo Gallery Overhaul

**Problem:** A 1-finger horizontal swipe inside the photo gallery was triggering the outer scroll container's page navigation (switching from Photos to Specs), not advancing the photo.

**Solution:** A unified `touchmove` listener (registered `{passive: false}` to allow `preventDefault()`) inspects `e.touches.length` at `touchstart` and the touch origin target:

- If touch started on the **thumbnail strip** → skip `preventDefault()`, allow native strip horizontal scroll
- If touch started on the **hero** (or anywhere outside the strip) → `preventDefault()` blocks native horizontal page scroll; `touchend` handler advances `heroIndex`

This is **target-aware prevention**: `stripRef.value.contains(e.target)` determines whether the strip or the hero owns the touch.

---

## Phase 2 — 5-Tier Touch Gesture System

All gesture logic lives in `onDossierTouchStart`, `onDossierTouchMove`, and `onDossierTouchEnd` in `UnitDossier.vue`. The finger count is captured at `touchstart` into `_touchCount` so it's stable even as fingers lift.

### Complete Gesture Map

| Fingers | Direction | Action |
|---|---|---|
| **1** | ← → | Previous / Next **photo** (gallery page only, wraps to end) |
| **2** | ← → | Previous / Next **unit** in shortlist (wraps around all 4 slots) |
| **3** | ← → | Previous / Next **dossier page** (Photos → Specs → Floor Plan → Neighborhood) |
| **3** | ↓ | **Reveal** tab bar + Neighborhood quick-access submenu (if on pg 4) |
| **3** | ↑ | **Hide** tab bar, return to full canvas |
| **4** | ↑ | **Exit** Presentation Mode (restores sidebar + header) |
| **4** | ↓ | **Enter** Presentation Mode (hides all chrome) |

### Gesture Thresholds

| Gesture | Minimum distance | Directional dominance |
|---|---|---|
| 1-finger photo | 40 px | `absDx > absDy` |
| 2-finger unit | 60 px | `absDx > absDy × 1.5` |
| 3-finger page | 60 px | `absDx > absDy × 1.2` |
| 3-finger chrome | 60 px | `absDy > absDx × 1.2` |
| 4-finger mode | 80 px | `absDy > absDx × 1.5` |

All thresholds are in `onDossierTouchEnd` and easy to tune after real-device testing.

### Technical Notes

- `touchmove` is registered `{passive: false}` — required so `e.preventDefault()` is legally callable (browsers ignore `preventDefault()` on passive listeners)
- Multi-finger (2+) horizontal swipes always prevent default. 4-finger vertical swipes always prevent default. 1-finger behavior is target-aware (see Phase 2 above)
- Desktop mouse drag-to-scroll (`useDragScroll` via `mousedown`/`mousemove`) is completely unaffected — entirely separate event path

---

## Phase 2 — Presentation Mode Chrome Behavior

**Tab bar** (`v-if="!isPresenting || tabBarVisible"`):
- Normal mode: always visible
- Presentation Mode: hidden by default
- 3-finger ↓ sets `tabBarVisible = true` → tab bar slides in via `<Transition>` (max-h + opacity)
- 3-finger ↑ sets `tabBarVisible = false` → slides out
- `tabBarVisible` auto-resets to `false` when user exits Presentation Mode (via `watch(isPresenting, ...)`)

**Neighborhood Quick-Access Submenu** (`v-if="tabBarVisible && currentPage === 3"`):
- Slides in below the main tab bar when chrome is revealed on the Neighborhood page
- Shows all 6 neighborhood sub-tabs (Map, Walk, Instagram, Facebook, Website, Site Map) as larger touch targets
- Tapping sets `activeNeighborhoodTab` and calls `scrollToPage(3)` to ensure correct page

---

## Phase 3 — Gesture Help Overlay (In-App Documentation)

A **"Help"** button sits at the right end of the tab bar, always reachable:
- In standard mode: visible in the tab bar at all times
- In Presentation Mode: reachable after 3-finger ↓ reveals the tab bar

Tapping opens a **bottom sheet overlay** (`absolute inset-0 z-50`) with:
- Title row with hand-raise icon
- Full gesture table: color-coded finger-dot indicators (gray=1, sky=2, primary=3, amber=4), direction arrow, bold label, plain-English description
- Blue tip callout explaining Presentation Mode navigation specifically
- Dismisses via backdrop tap (`@click.self`) or × button

The `GESTURE_GUIDE` constant array in `UnitDossier.vue` is the single source of truth for both the in-app help and the comment table in the touch handler.

---

## Known Limitations / Post-Deploy Testing Notes

| Item | Notes |
|---|---|
| **4-finger gestures in Safari** | iPadOS intercepts 4-finger gestures at the OS level (app switcher) before they reach the web layer. Enter/Exit Presentation Mode via 4-finger only works reliably in **home-screen PWA mode** (full-screen). Fallback: the existing exit button (`↙` arrow, `fixed top-4 right-4`) always works. |
| **Gesture thresholds** | Chosen conservatively. May need tuning after real-iPad testing. All values are in one function (`onDossierTouchEnd`). |
| **Transition clip** | The tab bar slide-in animation uses `max-h-20` (80 px). Tab bar actual height is ~62 px. No visual clipping expected. If tab bar is ever taller than 80 px, change `max-h-20` to `max-h-24`. |

---

## Files Modified

```
layers/base/components/tour/UnitDossier.vue         (+296 / -23)
layers/ops/components/location/LocationNotesModal.vue  (+1 / -1)
layers/ops/components/map/LocationPicker.vue           (+1 / -1)
layers/ops/pages/office/inventory/index.vue            (+1 / -1)
layers/ops/pages/office/inventory/installations.vue    (+1 / -1)
```
