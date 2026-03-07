# Latest Update — 2026-03-07

**Session:** Tier 2 Builder (Claude)
**Branch:** `feat/continue-dev-on-owners`
**Full doc:** `docs/status/SESSION_2026_03_07_OWNER_STATEMENTS.md`

---

## What Was Built

### 1. Distributions Page — Entity-Level & OB Two-Tier

- `entity_level` toggle added to New Distribution modal; auto-set for OB (locked, "Required for OB" badge)
- OB creates 2 line items (SBLP 85% + CLL-Southborder 15%) — entity-level mode stops traversal at property entities
- "Entity Distribution" button (violet) for SBLP quarterly rollup — user specifies amount manually
- Deletion policy enforced: Complete → locked (409 + lock icon); Processing → amber warning confirm; Draft → simple confirm
- Detail modal widened to `max-w-7xl`
- `UToggle` → `USwitch` throughout (UToggle obsolete in Nuxt UI v3)

### 2. Owner Statements Page (`/owners/statements`) — NEW

- Searchable entity dropdown: all entities that have received distributions
- Grouped by quarter with titled sections: *"2nd Quarter 2026 Distributions for Annabel Bloomberg Trust"*
- Columns: Property/Entity · Event · Total Property Distribution · Equity % · Distribution · Withheld · Transaction Date
- Quarter subtotal rows + grand total summary strip
- **Download PDF** — Chrome headless, landscape letter, matches grouped layout
- **Email** button — confirmation modal lists all entity PDFs before sending; one email to the profile with all entities as separate PDF attachments (Joanna Hess → 5 PDFs for all her trusts + daughters' trusts)

### 3. Migrations (5)

`000003–000007`: entity_level fields on distribution_events, nullable property_id, entity_level_distribution flag on properties (OB = TRUE), GL cleanup on entity_entity_ownership.

### 4. Bug Fix

`layers/ops/pages/amenities/index.vue` — last `UToggle` in codebase replaced with `USwitch`.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260306000003–000007` | 5 new migrations |
| `layers/owners/server/api/owners/distribution-events.get.ts` | entity_level / source_entity enrichment |
| `layers/owners/server/api/owners/distribution-events.post.ts` | two-mode distribution creation |
| `layers/owners/server/api/owners/distribution-events/[id].get.ts` | nullable property_id, source entity |
| `layers/owners/server/api/owners/distribution-events/[id].delete.ts` | status-based deletion policy |
| `layers/owners/server/api/owners/distribution-events/rollup.post.ts` | NEW — independent entity distribution |
| `layers/owners/server/api/owners/properties.get.ts` | added entity_level_distribution |
| `layers/owners/server/api/owners/individual-owners.get.ts` | GL from ownership_entities |
| `layers/owners/server/api/owners/individual-owners/[profileId]/[ownerId].patch.ts` | GL removed from payload |
| `layers/owners/server/api/owners/distribution-statements.get.ts` | NEW |
| `layers/owners/server/api/owners/distribution-statements/entities.get.ts` | NEW |
| `layers/owners/server/api/owners/distribution-statements/pdf.post.ts` | NEW |
| `layers/owners/server/api/owners/distribution-statements/email.post.ts` | NEW |
| `layers/owners/pages/owners/distributions.vue` | entity_level toggle, OB lock, rollup modal, deletion UI |
| `layers/owners/pages/owners/statements.vue` | NEW — quarterly statement page |
| `layers/base/components/AppNavigation.vue` | Owner Statements nav link |
| `layers/ops/pages/amenities/index.vue` | UToggle → USwitch |
