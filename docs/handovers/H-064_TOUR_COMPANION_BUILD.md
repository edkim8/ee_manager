# Handover: Tour Companion App — Build Report (H-064)
**Date:** February 28, 2026
**From:** Architect (Builder)
**To:** Foreman
**Depends On:** H-063 (UX Design Blueprint), F024 (Neighborhood Toolkit Research)
**Status:** Core scaffold complete. Pages 2 fully live. Pages 1, 3, 4 need content/config.

---

## 1. Files Changed

### Created
| File | Role |
|------|------|
| `layers/base/composables/useTourState.ts` | Unified tour state: shortlist, activeUnit, isPresenting |
| `layers/base/components/tour/TourShortlist.vue` | 4-slot unit selector bar |
| `layers/base/components/tour/UnitDossier.vue` | 4-page swipeable dossier canvas |

### Modified
| File | Change Summary |
|------|----------------|
| `layers/base/layouts/tour.vue` | Presentation Mode toggle + banner/header/sidebar collapse |
| `layers/base/pages/tour/dashboard.vue` | Uses new components; adds `unit_id` + `vacant_days` to DB query |

---

## 2. State — `useTourState.ts`

Single source of truth for all tour UI. Wraps `useTourSelection.ts` and adds `isPresenting`.

```typescript
const {
  shortlist,        // Ref<string[]>      — unit_name codes, max 4, localStorage-persisted
  activeUnitId,     // Ref<string|null>   — which dossier is open
  isPresenting,     // Ref<boolean>       — Presentation Mode flag
  togglePresenting, // () => void
  isFull,           // ComputedRef<boolean>
  toggle,           // (unitCode) => void — add/remove from shortlist
  setActive,        // (unitCode) => void
  clear,            // () => void
  MAX_TOUR_SLOTS,   // 4
} = useTourState()
```

All items are Nuxt auto-imported. `shortlist` persists across page reloads via `localStorage`. `isPresenting` resets to `false` on full reload (correct — agent always starts in setup mode).

---

## 3. Presentation Mode (Full Screen)

### Entering
Tap the **`[ ↗ ] PRESENT`** blue pill button in the top-right of the header.

### What collapses
`isPresenting = true` triggers CSS height/width transitions (`transition-all duration-300`) on four regions:

| Region | Normal | Presenting |
|--------|--------|------------|
| System banner | `h-8` | `h-0` |
| Header bar | `h-14` | `h-0` |
| Sidebar rail | `w-14` / `w-0` | `w-0` |
| **TourShortlist bar** | visible | **hidden** (`v-if="!isPresenting"`) |
| Main dossier canvas | remaining space | **100 % viewport** |

The amber Web-mode FAB also fades out so nothing distracts during a prospect walkthrough.

### Exiting
A frosted-glass `[↙]` button (`bg-black/30 backdrop-blur-sm`) is fixed at `top-4 right-4 z-70` and is visible over any page content. Tapping it calls `togglePresenting()`.

---

## 4. Component: `TourShortlist`

**Auto-import name:** `TourShortlist`

4-slot unit picker bar rendered at the top of the dashboard (hidden in Presentation Mode). Slots are color-coded by status: **emerald** = Available, **sky** = Applied.

Tapping a filled slot **always sets** `activeUnitId` (no toggle-off). Tapping an empty slot navigates to `/tour/availabilities` to build the shortlist.

```typescript
// Props
shortlistData: Array<{
  unit_name: string
  rent_offered?: number | null
  status?: string | null
}>
```

---

## 5. Component: `TourUnitDossier`

**Auto-import name: `TourUnitDossier`** — NOT `UnitDossier`.
(Nuxt prefixes the `tour/` subdirectory: `tour/UnitDossier.vue` → `TourUnitDossier`.)

```typescript
// Props
defineProps<{
  unit: UnitData           // Required
  propertyAddress?: string // Enables Map on Page 4
  walkScoreId?: string     // Activates Walk Score widget on Page 4
}>()

interface UnitData {
  unit_id?: string | null         // Drives photo fetch on Page 1
  unit_name: string
  floor_plan_name?: string | null
  b_b?: string | null             // e.g. "2/1"
  sf?: number | null
  rent_offered?: number | null
  available_date?: string | null
  status?: string | null
  building_name?: string | null
  vacant_days?: number | null     // Drives urgency tag on Page 2
}
```

**Navigation:** Native CSS `scroll-snap-type: x mandatory` — no external library. A tab bar (Photos · Specs · Floor Plan · Neighborhood) also drives `scrollTo()` programmatically.

---

## 6. Page 1 — Photo Gallery ✅ Live

### Layout (orientation-responsive)

**Portrait:**
```
┌────────────────────────────┐
│                            │
│        Hero Photo          │  ← fills space, object-cover
│        (1 / N badge)       │
├──┬──┬──┬──┬──┬──┬──┬──┬───┤
│▢ │▢ │▢ │▢ │▢ │             │  ← thumbnail strip, scrolls right
└──┴──┴──┴──┴──┴─────────────┘
```

**Landscape:**
```
┌───────────────────────┬──────┐
│                       │  ▢   │
│    Hero Photo         │  ▢   │  ← 92 px right panel
│    (1 / N badge)      │  ▢   │     scrolls down
│                       │  ▢   │
└───────────────────────┴──────┘
```

### Data flow

```
view_leasing_pipeline
  └─ unit_id (UUID)
       └─ fetchAttachments(unit_id, 'unit')   ← useAttachments composable
            └─ attachments table
                 └─ filter: file_type = 'image'
                      └─ photos[] → hero + thumbnail strip
```

The `watch` on `props.unit.unit_id` fires immediately and on every unit switch. It clears `photos` and resets `heroIndex = 0` before fetching, so no stale content ever flashes from the previous unit.

### States

| State | Hero area | Thumbnail strip |
|-------|-----------|-----------------|
| Loading | Full-area `animate-pulse` skeleton | Empty placeholder slots |
| Photos found | `object-cover` image + `1/N` counter badge | Tap-to-select buttons with `ring-2` active indicator |
| No photos | Gradient placeholder with instructions | Empty placeholder slots |

### Upload path (for content work)
Photos are managed in the **ops interface only**. The tour dossier is read-only.

> **→ See Section 11 for the demo population brief Foreman should assign to an agent.**

---

## 7. Page 2 — Specs & Financials ✅ Live (Prospect-Safe)

### Layout
Asymmetric 2-column grid. All data comes from `view_leasing_pipeline` — no internal cost or occupancy data is exposed.

**Left column — Apartment Details:**
| Field | Source | Display |
|-------|--------|---------|
| Layout | `b_b` | e.g. "2/1" bed/bath |
| Size | `sf` | formatted sq ft |
| Available | `available_date` | "Now" if ≤ today, else "Mar 5" |

**Right column — Financials:**
| Field | Source | Display |
|-------|--------|---------|
| Monthly Rent | `rent_offered` | Large hero card, primary color |
| Est. Move-In | `rent_offered × 2` | "First month + Security deposit" |

**Header badges (top-right):**
- **Urgency tag** — driven by `vacant_days`:
  - `≤ 5 days` → **Just Listed** (emerald)
  - `≤ 14 days` → **New** (sky)
  - `> 60 days` → **Great Deal** (amber)
  - Otherwise: no tag shown
- **Status badge** — Available (emerald) or Applied (sky)

### What is intentionally omitted (prospect-safe)
- Internal pricing notes
- Concession percentages
- Competing application count
- Days on market (only the urgency tag is shown, not the raw number)

---

## 8. Page 3 — Floor Plan ⏳ Placeholder

Currently renders a dashed-border placeholder box showing `floor_plan_name` as a label, with "Pinch to zoom" and "North" compass hints.

### To activate
Foreman must decide the data source and implement accordingly. Two options:

**Option A — Per floor plan** (recommended for efficiency)
Attach the floor plan image to the `floor_plans` record:
```typescript
fetchAttachments(unit.floor_plan_id, 'floor_plan')
```
One image serves every unit sharing that floor plan.

**Option B — Per unit**
Attach to the individual `units` record:
```typescript
fetchAttachments(unit.unit_id, 'unit_floor_plan')
// use a distinct record_type so it doesn't mix with gallery photos
```

Replace the placeholder `<div>` with a `<NuxtImg>` (with `pinch-zoom` library or CSS `touch-action: pinch-zoom`) once the image source is decided.

---

## 9. Page 4 — Neighborhood Toolkit ⏳ Placeholder (Config Required)

Three widgets, each with its own activation requirement:

### 9a. Local Map
```html
<!-- Activated when propertyAddress prop is passed to TourUnitDossier -->
<iframe :src="`https://maps.google.com/maps?q=${encoded}&output=embed`" />
```
No API key required. Falls back to a "Map unavailable" placeholder.

**To activate:** Store the property's full street address somewhere in the DB and pass it as `:property-address="address"` on `<TourUnitDossier>` in `dashboard.vue`.

### 9b. Walk Score Widget
```html
<!-- Activated when both propertyAddress and walkScoreId props are passed -->
<div id="ws-walkscore-tile" />
<!-- Script injected via useHead() -->
```
The component uses `useHead()` to inject the Walk Score config vars and script tag on the client.

**To activate:**
1. Register a free Walk Score ID at `walkscore.com/professional/api.php`
2. Store the WSID per property (suggest new `walk_score_id` column on `properties` table)
3. Pass as `:walk-score-id="property.walk_score_id"` on `<TourUnitDossier>`

### 9c. Community Social Feed (Instagram)
Currently a "Configure" placeholder button.

**To activate:**
1. Choose an aggregator: **EmbedSocial**, **SociableKIT**, or **Elfsight**
2. Authenticate the property's Instagram account on their dashboard
3. Replace the placeholder with the provided `<iframe>` URL per property
4. If the iframe is blocked by `X-Frame-Options`, implement the `<ExternalWebModal>` fallback pattern described in `F024_TOUR_NEIGHBORHOOD_TOOLKIT.md`

---

## 10. Page Status Summary

| Page | Status | Next action |
|------|--------|-------------|
| **Page 1 — Photos** | ✅ Live | Populate demo unit photos (see Section 11) |
| **Page 2 — Specs** | ✅ Live | Await leasing team feedback on amenities |
| **Page 3 — Floor Plan** | ⏳ Placeholder | Decide data source; attach floor plan images |
| **Page 4 — Neighborhood** | ⏳ Placeholder | Add property address + Walk Score ID to DB |

---

## 11. Demo Photo Population — Brief for Foreman's Agent

> **Foreman:** Assign this section as a standalone task to a content/setup agent.
> No code changes are needed. This is purely a data-entry task in the existing web UI.

---

### What the agent needs to do

Populate 3–5 real (or representative) photos for each unit that will be used in demo tours. Photos appear automatically on Page 1 of the Tour Dossier as soon as they are uploaded.

### Step-by-step upload instructions

1. Open the app at `http://localhost:3001` and log in with a staff account
2. In the **web interface** (not the tour tablet view), navigate to **Assets → Units**
3. Find the target demo unit and open its detail page — URL will be `/assets/units/{uuid}`
4. Scroll to the **"Photos & Files"** panel (the `AttachmentManager` component)
5. Tap the photo upload button and select images
   - Multiple files can be selected at once
   - The system auto-compresses to JPEG before uploading (max 1.2 MB per image)
   - Acceptable formats: JPEG, PNG, WebP
6. Once uploaded, switch to the tour tablet view (`/tour/dashboard`), load the shortlist, and tap the unit — Page 1 should immediately display the photos

### Which units to populate (recommended)

Populate at least one unit per property that is currently **Available** status. Find them with this Supabase query:

```sql
SELECT unit_id, unit_name, property_code, status, rent_offered, b_b
FROM view_leasing_pipeline
WHERE status = 'Available'
ORDER BY property_code, rent_offered
LIMIT 3;  -- adjust as needed
```

Or for a specific property:
```sql
SELECT unit_id, unit_name, b_b, sf, rent_offered
FROM view_leasing_pipeline
WHERE property_code = 'RS'   -- RS | SB | CV | OB | WO
  AND status = 'Available'
ORDER BY rent_offered
LIMIT 5;
```

### Photo recommendations for a convincing demo

| Shot | Purpose |
|------|---------|
| Living room (wide angle) | Hero shot — always upload first, shown as default |
| Kitchen | Key decision factor for prospects |
| Primary bedroom | Size reference |
| Bathroom | Often a deciding factor |
| View from windows (if any) | Premium differentiator |

Aim for **4–6 photos per unit**. Landscape orientation photos look best in the hero area. The thumbnail strip shows them all regardless of orientation.

### Verification checklist
- [ ] Unit appears in the shortlist at `/tour/availabilities`
- [ ] Tapping the unit on `/tour/dashboard` opens the dossier
- [ ] Page 1 shows the hero photo (not the "No photos yet" placeholder)
- [ ] Thumbnail strip shows all uploaded photos
- [ ] Tapping each thumbnail updates the hero image
- [ ] The `1 / N` counter badge in the top-left updates correctly
- [ ] Rotating the iPad shows the thumbnail strip move to the right side

---

## 12. Known Auto-Import Names

Critical — using the wrong name causes silent rendering failure.

| File (in `layers/base/`) | Auto-Import Name |
|--------------------------|-----------------|
| `components/tour/TourShortlist.vue` | `<TourShortlist>` |
| `components/tour/UnitDossier.vue` | **`<TourUnitDossier>`** |
| `composables/useTourState.ts` | `useTourState()`, `MAX_TOUR_SLOTS` |
| `composables/useTourSelection.ts` | `useTourSelection()` |
| `composables/useAttachments.ts` | `useAttachments()` |

---

## 13. Open Questions for Leasing Team

| # | Question | Blocks |
|---|----------|--------|
| 1 | What unit amenities should Page 2 show? (washer/dryer, balcony, etc.) They exist in `unit_amenities` table | Page 2 enhancement |
| 2 | Should floor plan images attach to `floor_plans` records or individual `units`? | Page 3 |
| 3 | Where should the canonical property address live? Suggest new `address` column on `properties` table | Page 4 map + Walk Score |
| 4 | Walk Score IDs — one per property. Suggest new `walk_score_id` column on `properties` table | Page 4 Walk Score |
| 5 | Which social aggregator for Instagram? (EmbedSocial / SociableKIT / Elfsight) | Page 4 social feed |
