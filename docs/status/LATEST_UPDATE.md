# Field Report: Dashboard Enhancements — Control Center Widgets
**Date:** 2026-02-21
**Model:** Claude Sonnet 4.6
**Branch:** feat/dashboard-fixes-widgets
**Status:** COMPLETE

---

## Summary

Enhanced the Control Center dashboard with real data pipelines and a new Inventory Health widget. Removed all hardcoded placeholder metrics and connected every widget to live Supabase queries scoped to `activeProperty`.

---

## Changes Made

### 1. Data Layer — `useDashboardData.ts`

Added three new fetchers:

| Fetcher | Source | Output |
|---|---|---|
| `fetchRenewalsStats` | `renewal_worksheet_items` | `{ total, offered, pending, accepted, declined }` |
| `fetchInventoryStats` | `view_inventory_installations` | `{ total, healthy, warning, critical, expired, unknown, atRisk }` |
| `fetchAvailabilityTrend` | `availability_snapshots` | `{ direction, delta, previousDate }` |

All three are property-scoped (`.eq('property_code', activeProperty.value)`) and included in the `watch(activeProperty)` block for automatic re-fetch on property switch.

**Renewals note:** Filters out `expired` status items; buckets `manually_accepted`/`manually_declined` with their Yardi-confirmed counterparts.

**Trend note:** Requires ≥2 snapshots to compute delta. Returns `null` when insufficient history exists — widget renders gracefully without the indicator.

---

### 2. RenewalsWidget — `layers/base/components/widgets/RenewalsWidget.vue`

- Removed hardcoded `24 / 8 / 12 / 4` placeholder values
- Wired to `renewalsStats` from composable via `onMounted`
- Status columns: **Offered** (was "Sent"), **Pending**, **Signed** (accepted)
- Dynamic alert banner: shows declined count (red) if any, otherwise shows pending follow-up nudge (amber)
- Added "View Renewals" link → `/office/renewals`

---

### 3. New Widget — `layers/base/components/widgets/InventoryWidget.vue`

New widget backed by `view_inventory_installations.health_status`.

**Features:**
- Total asset count with "At Risk" callout badge (critical + expired)
- Segmented health bar: green (healthy) → yellow (warning) → orange (critical) → red (expired)
- Status badges per health tier, hidden if count = 0
- Shield-check icon when no at-risk assets exist
- "View Inventory" link → `/office/inventory/installations`
- Loading skeleton state

---

### 4. AvailabilityWidget Polish — `layers/base/components/widgets/AvailabilityWidget.vue`

- Added `availabilityTrend` + `fetchAvailabilityTrend` from composable
- Trend arrow icon inline with occupancy percentage:
  - `arrow-trending-up` (green) when occupancy increased
  - `arrow-trending-down` (red) when decreased
  - `minus` (gray) when flat
- Delta percentage shown below tile (e.g., `+1.2% vs prev snapshot`)
- Gracefully hidden when no trend data is available

---

### 5. Dashboard Registry — `layers/base/pages/index.vue`

- Imported `InventoryWidget`
- Registered as `{ id: 'inventory', title: 'Inventory Health', icon: 'i-heroicons-cpu-chip' }`
- Appears in Configure modal toggle list
- Positioned at end of default order; draggable by user

---

## Data Contracts

### `renewalsStats`
```ts
{ total: number; offered: number; pending: number; accepted: number; declined: number }
```

### `inventoryStats`
```ts
{ total: number; healthy: number; warning: number; critical: number; expired: number; unknown: number; atRisk: number }
```

### `availabilityTrend`
```ts
{ direction: 'up' | 'down' | 'flat'; delta: string; previousDate: string } | null
```

---

## Files Modified

| File | Change |
|---|---|
| `layers/base/composables/useDashboardData.ts` | Added 3 fetchers, refs, watch entries, exports |
| `layers/base/components/widgets/RenewalsWidget.vue` | Replaced hardcoded data with live composable |
| `layers/base/components/widgets/AvailabilityWidget.vue` | Added trend arrow indicator |
| `layers/base/pages/index.vue` | Registered InventoryWidget |

## Files Created

| File | Purpose |
|---|---|
| `layers/base/components/widgets/InventoryWidget.vue` | New inventory health dashboard widget |
