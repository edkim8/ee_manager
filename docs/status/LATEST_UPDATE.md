# Field Report — H-083/H-084: Daily Solver Email — Full Refinement + Live Report Page

**Date:** 2026-03-11
**Session:** H-083 (Tier 2 Builder — Goldfish) + H-084 continuation
**Branch:** main
**Commit:** `6f22798`
**Status:** COMPLETE ✓

---

## Objective

Refine the Daily Solver Email Summary for maximum operational clarity, fix scoping bugs, add day-over-day snapshot deltas, reorganize property cards, add Live Report and Report Guide pages in-app, and surface action buttons in the email header.

---

## Changes Made

### `layers/base/utils/reporting.ts`

**Removed (noise / dead code):**
- `renderStatCard()` + "System Overview - Details" stat cards block
- `renderAvailabilitiesSection()` — redundant stub
- `renderLeaseSignedRow()` + `lease_signed` event section — dead event type

**Added:**
- `👤 New Residents` event table — `new_tenancy` events now surface as a full detail table
- Individual resident detail rows in Notices section (no more "coming soon" placeholder)
- New types: `SnapshotDelta`, `PropertySnapshotDeltas`, `PropertyRenewalCounts`, `PropertyRenewalCountsMap`
- `renderDelta(delta, invert?)` and `renderRentDelta(delta)` helpers for color-coded deltas
- `OperationalSummary.workOrders.overdueOpen?: number` — open WOs > 3 days
- `OperationalSummary.delinquencies.amount30Plus?: number` — 30+ day aging bucket total
- Header action buttons: `📊 Live Report →` and `❓ Report Guide` (rendered only when `baseUrl` is provided)

**Restructured:**
- Property cards split into **Availabilities** module (available_count + delta, applications, notices, avg contracted rent + delta) and **Renewals** module (Offer Pending, Awaiting Response, Completed This Run)
- Email section order: ① Property Breakdown → ② Operational Summary (conditional) → ③ Today's Activity → ④ Technical Health
- Operational Summary uses 2-column grid; Delinquencies shows 30+ Days amount; Work Orders shows "Open > 3 Days"
- Header date: `"Monday, March 10, 2026"` (full weekday); batch ID is secondary
- Fixed `new Set<string>(...)` for TS strict mode

### `layers/base/server/api/admin/notifications/send-summary.post.ts`

**Bug fix — operational summary scoping:**
- All 4 operational queries now include `property_code` in `.select()`
- Operational summary computation moved inside the per-recipient loop using filtered subsets (`ra`, `rwo`, `rmr`, `rd`)
- Previously: all-5-property summary sent to RS+SB-only recipients. Now correctly scoped.

**Added:**
- Availability snapshots query (today + yesterday) → builds `allSnapshotDeltas` → scoped per recipient
- `renewal_worksheet_items` query (pending + offered) → builds `allRenewalCounts` → scoped per recipient
- `call_date` in work orders select; overdue threshold = 3 days before upload date
- `days_31_60`, `days_61_90`, `days_90_plus` in delinquencies select; computes `amount30Plus`
- `created_at` in work orders select; `newToday` now computed (was hardcoded 0)

**Fixed:**
- Email subject uses `run.upload_date` (not send time)
- "Today" comparisons use `uploadDateStr` (from `run.upload_date`, not `new Date()`)

### New: `scripts/preview-email.ts`

Local preview generator — `npx tsx scripts/preview-email.ts` → `/tmp/solver-email-preview.html`

Includes realistic 5-property mock data with snapshotDeltas, renewalCounts, and full event set.

### New: `layers/admin/server/api/solver/email-preview.get.ts`

GET route returning `{ html, run }` for the most recent completed solver run.
- Auth: service role (no email sending)
- Fetches all operational data in parallel (`Promise.all`)
- Returns full HTML from `generateHighFidelityHtmlReport`

### New: `layers/admin/pages/admin/solver/report.vue`

In-app live report page at `/admin/solver/report`.
- Calls `/api/solver/email-preview`
- Renders email HTML inline via `v-html`
- Includes Refresh button and Report Guide link

### New: `layers/admin/pages/admin/solver/report-help.vue`

Context guide at `/admin/solver/report-help` explaining every section:
- Property Breakdown (Availabilities module, Renewals module)
- Operational Summary (Alerts, Work Orders, MakeReady, Delinquencies)
- Today's Activity (New Residents, Renewals, Price Changes, Applications, Notices)
- Technical Health
- Property Codes reference table

---

## Tests

**File:** `tests/unit/base/reporting.test.ts`

793/793 tests passing across 31 files.

42 tests in `reporting.test.ts` (21 new for `generateHighFidelityHtmlReport`):

| Group | Tests |
|---|---|
| Structure | Date in header, batch ID, Property Breakdown, property names, footer |
| Event tables | New residents, renewals, price changes, no stubs, no "coming soon", empty-event omission |
| Notices | Aggregate summary, individual rows, multi-notice aggregation, omitted when empty |
| Operational summary | All 4 boxes, delinquency currency, Technical Health, failed status, omitted when not provided |
| Property filtering | Unknown codes excluded |
| Snapshot deltas | available_count display, negative delta (green), zero = "no change", rent delta colors, null omitted, fallback to event counts |

---

## Email Structure

1. Header (date prominent, batch ID secondary, **Live Report + Report Guide buttons**)
2. Property Breakdown (Availabilities + Renewals modules per property)
3. Operational Summary (conditional — only if provided)
4. Today's Activity (👤 New Residents, 🔄 Renewals, 💰 Price Changes, 📝 Applications, 📋 Notices)
5. Technical Health (conditional)
6. Footer

---

## App Pages Added

| Route | Purpose |
|---|---|
| `/admin/solver/report` | Live in-app render of the latest solver email |
| `/admin/solver/report-help` | Context guide explaining every section |
