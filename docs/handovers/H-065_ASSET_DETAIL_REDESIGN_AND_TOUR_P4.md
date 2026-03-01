# Handover: Asset Detail Redesign + Tour Page 4 Polish (H-065)

**Date:** March 1, 2026
**From:** Architect (Builder)
**To:** Foreman
**Branch:** `feat/mobile-ui`
**Depends On:** H-064 (Tour Companion Build), F024 (Neighborhood Toolkit Research)
**Status:** ✅ Complete — all type checks pass, migration applied to remote DB

---

## 1. Summary of Work

This session covers four areas completed in a single working block:

| # | Area | Status |
|---|------|--------|
| A | Property social/digital links — DB + edit form + Tour Page 4 | ✅ Done |
| B | Asset detail page redesigns — Buildings + Units (tab layout) | ✅ Done |
| C | `AssetsLocationsTabPanel` — reusable Locations tab component | ✅ Done |
| D | Tour Page 4 polish — map zoom, iframe security, bug fixes | ✅ Done |

---

## 2. Files Changed

### Created
| File | Role |
|------|------|
| `supabase/migrations/20260301000001_add_property_social_links.sql` | Adds `instagram_url`, `facebook_url`, `site_map_url`, `walk_score_id` to `properties` table |
| `supabase/migrations/20260301000002_fix_property_coordinates.sql` | Corrects swapped `latitude`/`longitude` values for all 5 properties |
| `layers/ops/components/assets/LocationsTabPanel.vue` | Reusable Locations tab (LocationMap + LocationPicker) — auto-imported as `AssetsLocationsTabPanel` |

### Modified
| File | Change Summary |
|------|----------------|
| `types/supabase.ts` | Added 4 new columns to `properties` Row/Insert/Update types |
| `layers/base/components/tour/UnitDossier.vue` | DB-driven Page 4 links, map zoom z=17, Instagram/Facebook open cards, v-show bug fix |
| `layers/base/pages/tour/dashboard.vue` | Fetches `propertyRecord` and passes 8 new props to `TourUnitDossier` |
| `layers/ops/pages/assets/properties/[id].vue` | Added Settings tab with Digital Presence section (social + walk score fields) |
| `layers/ops/pages/assets/buildings/[id].vue` | Full redesign: hero photo + SimpleTabs (Overview, Locations, Inventory, Settings) |
| `layers/ops/pages/assets/units/[id].vue` | Full redesign: hero photo + SimpleTabs (Overview, Locations, Inventory, Settings) |

---

## 3. Area A — Property Social / Digital Links

### Database Migration (`20260301000001`)
Added four columns to `properties`:
```sql
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS instagram_url  TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url   TEXT,
  ADD COLUMN IF NOT EXISTS site_map_url   TEXT,
  ADD COLUMN IF NOT EXISTS walk_score_id  TEXT;
```
`website_url`, `latitude`, `longitude` already existed. All are now editable via the Properties Settings tab.

### Properties Settings Tab (`/assets/properties/[id]`)
Added a **Settings** tab with three sections:
- **Property Info** — name, description, year_built, total_unit_count, primary_image_url
- **Address** — street_address, city, state_code, postal_code, latitude, longitude
- **Digital Presence** — website_url, instagram_url, facebook_url, site_map_url (with embed URL note), walk_score_id

### Social Link Backfill
All 5 properties have `site_map_url` populated (Sightmap embed URLs). RS and SB have Instagram and Facebook URLs. CV, OB, WO social URLs are still null — awaiting client-provided URLs.

### Tour Dashboard (`dashboard.vue`)
Added a second `useAsyncData` call to fetch `propertyRecord` from the `properties` table. Passes 8 props to `<TourUnitDossier>`:
- `property-address` — formatted address string
- `walk-score-id`, `latitude`, `longitude`
- `website-url`, `instagram-url`, `facebook-url`, `site-map-url`

---

## 4. Area B — Asset Detail Page Redesigns

Both **buildings** and **units** detail pages were redesigned to match the properties detail page format.

### Common Pattern
```
Full-width hero photo (h-[400px])
SimpleTabs → Overview | Locations | Inventory | Settings
```

### Buildings (`/assets/buildings/[id]`)
| Tab | Contents |
|-----|----------|
| Overview | Stats (Floors, Total Units, Floor Plans) + Units table + Description \| Sidebar: Quick Insights dark card + AttachmentManager |
| Locations | `AssetsLocationsTabPanel` (see Area C) |
| Inventory | Health summary (4 stat cards) + GenericDataTable via `fetchItemsByLocation('building', id)` |
| Settings | Building Info (name, description, floor_count, primary_image_url) + Address section |

### Units (`/assets/units/[id]`)
| Tab | Contents |
|-----|----------|
| Overview | Stats (Bed/Bath, Area, Floor) + Unit Details card + Lease History + Resident History \| Sidebar: Quick Insights + Floor Plan image + AttachmentManager + Amenities |
| Locations | `AssetsLocationsTabPanel` (see Area C) |
| Inventory | Health summary (4 stat cards) + GenericDataTable via `fetchItemsByLocation('unit', id)` |
| Settings | 2 editable fields only (description, primary_image_url) + read-only Yardi-managed fields reference |

**Important note on Units Settings:** Only `description` and `primary_image_url` are locally editable on units. All other fields (`unit_name`, `floor_number`, `building_id`, `floor_plan_id`, `usage_type`) are Yardi-managed and updated on each sync. The Settings tab makes this explicit with a read-only reference section.

---

## 5. Area C — `AssetsLocationsTabPanel` Component

**File:** `layers/ops/components/assets/LocationsTabPanel.vue`
**Auto-import name:** `AssetsLocationsTabPanel`

Extracts the repeated Locations tab pattern (LocationMap 2/3 + LocationPicker 1/3) into a self-contained component.

```vue
<AssetsLocationsTabPanel :property-code="building.property_code" />
<AssetsLocationsTabPanel :property-code="unit.property_code" />
```

The component:
- Accepts a single `propertyCode: string` prop
- Internally calls `fetchLocations(propertyCode)` via `useLocationService`
- Handles its own refresh on `@location-saved`
- Uses a typed `any[]` computed to bridge the `LocationRecord` → `Location` type gap (LocationMap's local interface requires `id: string`, LocationRecord has `id?: string`)

**Note on Locations scope:** `useLocationService.fetchLocations()` is property-scoped — there is no `building_id` filter on the locations table. Both buildings and units show all infrastructure markers for the property. This is intentional and useful (e.g., a unit can see where the electrical room is).

---

## 6. Area D — Tour Page 4 Polish

### Google Maps Zoom (z=15 → z=17)
When using lat/lng coordinates, zoom level is now 17 (fills the frame with the property complex and immediate surroundings). Address-string fallback remains at z=15 (lower precision, wider context).

```ts
// lat/lng: tight property view
`https://maps.google.com/maps?q=${lat},${lng}&t=&z=17&ie=UTF8&iwloc=&output=embed`
```

### Instagram / Facebook — Tap-to-Open Cards
Instagram and Facebook **permanently block iframe embedding** via:
- Instagram: `Content-Security-Policy: frame-ancestors 'none'`
- Facebook: `X-Frame-Options: DENY`

This applies to **all browsers and all devices** — Chrome desktop AND iPad Safari. Attempting an iframe always produces "refused to connect."

**Fix:** For `instagram` and `facebook` tabs, `UnitDossier.vue` now skips the iframe entirely and renders a full-screen branded open card:
- Instagram: purple→pink→amber gradient
- Facebook: `#1877F2` blue
- Single large **Open** button → `window.open(url, '_blank', 'noopener,noreferrer')` → opens in device browser

### v-show + v-else-if Bug Fix
The Page 4 content area used `v-show` for the Walk Score panel followed by `v-else-if`/`v-else`. Vue's template compiler requires `v-else-if`/`v-else` to follow a `v-if`, not `v-show`. This caused Vite to return a 404 on the file (HMR rejection).

**Fix:** Changed to three independent `v-if` / `v-if` / `v-if` conditions. Since all panels are `absolute inset-0` inside `relative overflow-hidden`, only the active one is visible. Walk Score keeps `v-show` (must remain in DOM for the widget script to find `#ws-walkscore-tile`).

### Coordinate Swap Fix (Migration `20260301000002`)
All 5 properties had `latitude` and `longitude` columns storing reversed values (~-111 as latitude, ~33 as longitude). Latitude -111 is out of the valid range (-90 to +90) so Google Maps rejected the coordinates entirely.

Migration corrected all 5 properties:
| Property | Latitude (correct) | Longitude (correct) |
|----------|--------------------|---------------------|
| RS | 33.4653 | -111.990 |
| SB | 33.2905 | -111.848 |
| CV | 32.7142 | -117.149 |
| OB | 32.5572 | -117.057 |
| WO | 33.1460 | -117.164 |

---

## 7. Walk Score — Pending Configuration

The Walk Score widget is wired up but needs a **WSID** to display. To configure:

1. Register at **https://www.walkscore.com/professional/api.php**
2. Walk Score issues a `wsid` (widget site ID) tied to your registered domain
3. Enter the wsid in the `walk_score_id` field under Assets → Properties → Settings for each property (or one shared value if the wsid is domain-wide)

**Current code approach:** Uses the legacy Walk Score tile widget (`show-walkscore-tile.php`). The script reads global JS vars `ws_wsid`, `ws_address`, `ws_format`, etc., injected via `useHead`, and populates `<div id="ws-walkscore-tile">`.

**To consider:** If Walk Score issues a JSON API key rather than a widget wsid, the Walk Score tab will need to be rebuilt to fetch scores server-side and render a custom UI. Flag for next session.

---

## 8. Pending / Follow-up Items

| Item | Owner | Notes |
|------|-------|-------|
| Social URLs for CV, OB, WO | Client | Instagram + Facebook URLs not yet provided |
| Walk Score WSID registration | Client | Register at walkscore.com/professional |
| Website tab iframe | Test | Some property websites may block iframe; the Open button overlay is the fallback |
| Tour Page 3 (Floor Plan) | Builder | Currently a placeholder — needs floor plan image wiring |
| Docs: three-mode PDF system | Builder | `memory/three-mode-pdf.md` still marked PENDING |

---

## 9. Type Safety

All modified files pass `npx nuxi typecheck` with zero errors introduced. Pre-existing errors in `useAvailabilityAnalysis.ts`, `useLocationNotes.ts`, `useLocationService.ts`, `useMtmHistory.ts`, and `useConstantsMutation.ts` are unchanged from before this session.
