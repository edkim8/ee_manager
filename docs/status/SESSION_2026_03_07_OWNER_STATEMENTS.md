# Session Summary: Owner Distributions — Entity Statements & PDF/Email
**Date:** 2026-03-07
**Branch:** `feat/continue-dev-on-owners`
**Builder:** Tier 2 (Claude)

---

## Objective

Extend the distributions module with:
1. Personal-entity-level distributions (show Trust/LLC names, not individual profiles)
2. OB two-tier handling (monthly entity-level → SBLP/CLL; quarterly SBLP rollup)
3. Status-based deletion policy (Draft/Processing/Complete)
4. Owner Statements page — per-entity distribution history, grouped by quarter, with PDF download and email

---

## Migrations Applied (db push required)

| File | Change |
|---|---|
| `20260306000003_add_distribution_gl_to_entity_entity.sql` | Added `distribution_gl` to `entity_entity_ownership` (later reversed — canonical source is `ownership_entities`) |
| `20260306000004_drop_distribution_gl_from_entity_entity.sql` | Dropped the column added above |
| `20260306000005_distribution_entity_level_and_rollup.sql` | Added `entity_level BOOLEAN DEFAULT FALSE`, `source_entity_id UUID`, `rollup_event_ids UUID[]` to `distribution_events` |
| `20260306000006_nullable_property_id_on_distributions.sql` | Made `property_id` nullable on `distribution_events` (required for entity distributions not tied to a property) |
| `20260306000007_property_entity_level_distribution.sql` | Added `entity_level_distribution BOOLEAN DEFAULT FALSE` to `properties`; set `TRUE` for OB |

---

## Server Routes Changed / Added

### Existing Routes — Updated

| Route | Change |
|---|---|
| `distribution-events.get.ts` | Added `entity_level`, `source_entity_id`, `rollup_event_ids` to select; handle nullable `property_id`; enrich `source_entity_name` for entity distributions |
| `distribution-events.post.ts` | Rewrote to handle two modes: `entity_level=true` (stops at property entities) vs `entity_level=false` (traverses to personal entities). GL codes always from `ownership_entities.distribution_gl` |
| `distribution-events/[id].get.ts` | Handle nullable `property_id`; enrich `source_entity_name` |
| `distribution-events/[id].delete.ts` | Status-based deletion policy: Complete → 409 blocked; Processing → allowed with warning; Draft → freely deletable |
| `properties.get.ts` | Added `entity_level_distribution` to select |
| `individual-owners.get.ts` | GL codes joined from `ownership_entities` (canonical source), not `owner_profile_mapping` |
| `individual-owners/[profileId]/[ownerId].patch.ts` | Removed `distribution_gl`/`contribution_gl` from payload — those save to `ownership_entities` via entities PATCH |

### New Routes

| Route | Purpose |
|---|---|
| `distribution-events/rollup.post.ts` | Independent entity distribution (e.g. SBLP quarterly). Takes `source_entity_id + total_amount` — amount is user-specified, not auto-summed. Queries `entity_entity_ownership` for partners |
| `distribution-statements.get.ts` | Full line-item history for a single `entity_id`, enriched with event metadata (`event_total_amount`, `property_code`, `source_entity_name`, `distribution_date`) |
| `distribution-statements/entities.get.ts` | All unique recipient entities from `distribution_line_items`, with associated profile info (name, email) |
| `distribution-statements/pdf.post.ts` | Chrome headless PDF for one entity — grouped by quarter, matches on-screen layout |
| `distribution-statements/email.post.ts` | Nodemailer email to profile — generates one PDF per entity for the profile, sends all as attachments |

---

## Pages Changed / Added

### `layers/owners/pages/owners/distributions.vue` — Major Update

- `entity_level` field added to `emptyForm`
- `watch(() => createForm.value.property_id)` auto-sets `entity_level` from property's `entity_level_distribution` flag
- `propertyForcesEntityLevel` computed — locks the switch for OB; shows "Required for OB" badge
- `UToggle` → `USwitch` (UToggle obsolete in Nuxt UI v3)
- "Entity Distribution" button (violet, building-library icon) opens rollup modal
- Rollup modal: entity selector + manual amount + title + date (no source event selection)
- Events table: `property_code` cell shows violet entity badge for entity distributions; title cell shows "Entity" or "Rollup" badge
- Detail modal: widened to `max-w-7xl`; shows entity/property header depending on distribution type
- Deletion: Complete rows show lock icon + tooltip; Processing rows show amber trash with hard confirm
- "Owner Statements" ghost button in filter bar links to `/owners/statements`

### `layers/owners/pages/owners/statements.vue` — NEW

- Searchable entity dropdown (all entities that have received distributions)
- Shows contact name + email below selector
- Grand total summary strip
- **Quarterly grouping:** each quarter is a titled section — *"2nd Quarter 2026 Distributions for Annabel Bloomberg Trust"* — with subtotal on the right
- Table columns: Property/Entity · Event · Total Property Distribution · Equity % · Distribution (net) · Withheld (if any) · Transaction Date
- Quarter subtotal row at bottom of each group
- CA Form 592 notice when withheld > 0
- **Download PDF** — landscape letter PDF matching the grouped on-screen layout
- **Email** button — opens confirmation modal listing all entities that will be attached; send only after explicit confirm

---

## Navigation

`layers/base/components/AppNavigation.vue` — added "Owner Statements" (`i-heroicons-document-text`) link under Owners section.

---

## Bug Fixes

| File | Fix |
|---|---|
| `layers/ops/pages/amenities/index.vue` | `UToggle` → `USwitch` (last remaining UToggle in codebase) |

---

## Architecture Notes

### GL Code — Single Source of Truth
`ownership_entities.distribution_gl` is the canonical field (exists since migration `20260224000002`).
- Distribution POST reads from `ownership_entities.distribution_gl` when building line items
- Individual Owners GET joins GL from `ownership_entities`
- Individual Owners save calls `PATCH /api/owners/entities/{id}` for GL changes
- No GL on `owner_profile_mapping` or `entity_entity_ownership`

### OB Two-Tier Model
1. **OB Monthly** → entity-level distribution → 2 line items (SBLP 85%, CLL-Southborder 15%)
   - Auto-detected: `property.entity_level_distribution = TRUE` locks the toggle
2. **SBLP Quarterly** → independent entity distribution → 9 partner line items
   - User specifies amount manually (SBLP retains some OB funds for expenses)
   - Created via "Entity Distribution" modal → `rollup.post.ts`

### Deletion Policy
| Status | Policy |
|---|---|
| Draft | Freely deletable — simple confirm |
| Processing | Deletable with amber warning confirm showing confirmed count |
| Complete | Blocked at server (409) + lock icon in UI |

### Owner Statement Email Scope
When emailing a profile, ALL entities mapped to that profile are included (Joanna Hess → 5 entities: her 2 trusts + 3 daughters' trusts). One PDF per entity, all attached to one email.

---

## Files Changed Summary

| File | Type |
|---|---|
| `supabase/migrations/20260306000003–000007` | New migrations (5) |
| `layers/owners/server/api/owners/distribution-events.get.ts` | Modified |
| `layers/owners/server/api/owners/distribution-events.post.ts` | Modified |
| `layers/owners/server/api/owners/distribution-events/[id].get.ts` | Modified |
| `layers/owners/server/api/owners/distribution-events/[id].delete.ts` | Modified |
| `layers/owners/server/api/owners/distribution-events/rollup.post.ts` | New |
| `layers/owners/server/api/owners/properties.get.ts` | Modified |
| `layers/owners/server/api/owners/individual-owners.get.ts` | Modified |
| `layers/owners/server/api/owners/individual-owners/[profileId]/[ownerId].patch.ts` | Modified |
| `layers/owners/server/api/owners/distribution-statements.get.ts` | New |
| `layers/owners/server/api/owners/distribution-statements/entities.get.ts` | New |
| `layers/owners/server/api/owners/distribution-statements/pdf.post.ts` | New |
| `layers/owners/server/api/owners/distribution-statements/email.post.ts` | New |
| `layers/owners/pages/owners/distributions.vue` | Modified (major) |
| `layers/owners/pages/owners/statements.vue` | New |
| `layers/base/components/AppNavigation.vue` | Modified |
| `layers/ops/pages/amenities/index.vue` | Modified (UToggle fix) |
