# Field Report — H-083 / H-084: Daily Solver Email + Live Report Page

**Date:** 2026-03-11
**Sessions:** H-083 + H-084
**Branch:** main (direct commits)
**Commits:** `6f22798`, `6baa1e5`, `a92ee10`
**Status:** COMPLETE ✓
**Tests:** 793/793 passing

---

## Summary

Two-session build:
- **H-083** — Refined the Daily Solver Email from the ground up: removed noise, fixed a property-scoping bug that was sending all-5-property operational data to recipients who only subscribe to 2 properties, added day-over-day availability deltas, added renewal pipeline counts, reorganized property cards into two focused modules, fixed email subject date.
- **H-084** — Created a live in-app report page and context guide accessible to all authenticated users. Added both pages to the Dashboard nav dropdown.

---

## Modified Files

### `layers/base/utils/reporting.ts`

**Removed:**
- `renderStatCard()` + "System Overview - Details" stat cards block
- `renderAvailabilitiesSection()` — redundant stub
- `renderLeaseSignedRow()` + `lease_signed` event section — dead event type

**Added:**
- `👤 New Residents` event table — `new_tenancy` events with full detail (Resident / Unit / Property / Status / Move-In)
- Individual resident detail rows in Notices section (removed "coming soon" placeholder)
- Interfaces: `SnapshotDelta`, `PropertySnapshotDeltas`, `PropertyRenewalCounts`, `PropertyRenewalCountsMap`
- `OperationalSummary.workOrders.overdueOpen?: number`
- `OperationalSummary.delinquencies.amount30Plus?: number`
- Delta helpers: `renderDelta(delta, invert?)` and `renderRentDelta(delta)`
- Header action buttons: `📊 Live Report →` (`/solver/report`) and `❓ Report Guide` (`/solver/report-help`) — rendered only when `baseUrl` is provided

**Restructured:**
- Property cards split into **Availabilities** module and **Renewals** module:
  - Availabilities: available units count + delta, applications, notices, avg contracted rent + delta
  - Renewals: Offer Pending (amber), Awaiting Response (indigo), Completed This Run (green)
- Email section order: Property Breakdown → Operational Summary (conditional) → Today's Activity → Technical Health
- Operational Summary: Delinquencies shows 30+ Days amount; Work Orders shows "Open > 3 Days"
- Header: full weekday date format (`Monday, March 10, 2026`); batch ID is secondary
- Fixed `new Set<string>(...)` for TS strict mode

### `layers/base/server/api/admin/notifications/send-summary.post.ts`

**Bug fix — operational summary scoping:**
All 4 operational queries previously omitted `property_code` from `.select()`. Fixed — `property_code` added to every select, operational summary computation moved inside the per-recipient loop.

**Added queries:**
- `availability_snapshots` (today + yesterday) → `allSnapshotDeltas` → scoped per recipient
- `renewal_worksheet_items` (pending + offered) → `allRenewalCounts` → scoped per recipient

**Added fields:**
- `call_date` on work orders → `overdueOpen` (threshold: 3 days before upload_date)
- `days_31_60`, `days_61_90`, `days_90_plus` on delinquencies → `amount30Plus`
- `created_at` on work orders → `newToday` (was hardcoded 0)

**Fixed:**
- Email subject uses `run.upload_date`, not `new Date()` (wrong when sent after midnight)
- All "today" comparisons use `uploadDateStr` from `run.upload_date`

### `layers/base/components/AppNavigation.vue`
- Dashboard nav item converted to dropdown with three children: Dashboard, Daily Report, Report Guide
- Daily Report + Report Guide visible to all authenticated users

### `tests/unit/base/reporting.test.ts`
- 21 new tests for `generateHighFidelityHtmlReport` (was 21 for markdown only)
- Groups: structure, event tables, notices, operational summary, property filtering, snapshot deltas

---

## New Files

### `scripts/preview-email.ts`
Local HTML preview generator. Run: `npx tsx scripts/preview-email.ts` → `/tmp/solver-email-preview.html`

Realistic 5-property mock data including snapshotDeltas, renewalCounts, and full event set.

### `layers/admin/server/api/solver/email-preview.get.ts`
`GET /api/solver/email-preview` — returns `{ html, run }` for the most recent completed solver run.
- Uses `serverSupabaseServiceRole` (auth-gated, no email sending)
- All operational queries in parallel via `Promise.all`
- Same data pipeline as `send-summary.post.ts`

### `layers/admin/pages/solver/report.vue`
Page at `/solver/report` — Live Solver Report.
- Calls `/api/solver/email-preview` via `useFetch`
- Renders email HTML inline via `v-html`
- Refresh button + Report Guide link
- `layout: 'dashboard'`, no admin middleware — accessible to all authenticated users

### `layers/admin/pages/solver/report-help.vue`
Page at `/solver/report-help` — Context Guide.
- Explains every section: Property Breakdown (Availabilities + Renewals modules), Operational Summary (4 boxes), Today's Activity (5 event types), Technical Health
- Property Codes reference table (RS/SB/CV/OB/WO)
- `layout: 'dashboard'`, no admin middleware — accessible to all authenticated users

---

## Access Model

| Page | URL | Who can access |
|---|---|---|
| Live Report | `/solver/report` | All authenticated users |
| Report Guide | `/solver/report-help` | All authenticated users |
| Email Preview API | `/api/solver/email-preview` | All authenticated users (service role DB access, no RLS exposure) |

The `admin` middleware in `layers/admin/middleware/admin.ts` is opt-in per page. These pages do not declare it.

---

## Email Structure (Final)

1. Header (date prominent, batch ID secondary, **Live Report + Report Guide buttons**)
2. Property Breakdown — one card per property, two modules each:
   - Availabilities: units (snapshot+delta), applications, notices, avg rent (snapshot+delta)
   - Renewals: Offer Pending / Awaiting Response / Completed This Run
3. Operational Summary (conditional — Alerts, Work Orders, MakeReady, Delinquencies)
4. Today's Activity (👤 New Residents · 🔄 Renewals · 💰 Price Changes · 📝 Applications · 📋 Notices)
5. Technical Health (conditional)
6. Footer

---

## Tests

```
793 tests passing across 31 files
```
