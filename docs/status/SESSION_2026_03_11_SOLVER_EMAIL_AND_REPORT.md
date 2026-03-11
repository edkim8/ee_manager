# Session Summary: H-083 / H-084 — Daily Solver Email Refinement + Live Report Page

**Date:** 2026-03-11
**Branch:** `main` (direct commits)
**Commits:** `6f22798`, `6baa1e5`, `a92ee10`
**Builder:** Tier 2 Claude (Goldfish)
**Tests:** 793/793 passing

---

## Objective

Two-part session:

**H-083** — Refine the Daily Solver Email Summary for operational clarity:
remove noise, surface missing data, fix date/subject bugs, fix property scoping bug, add day-over-day availability deltas, add renewal pipeline counts, reorganize property cards.

**H-084** — Add live report access to all users:
create in-app live report page, create context guide page, add nav links under Dashboard for all authenticated users.

---

## Commits

| Commit | Description |
|---|---|
| `6f22798` | feat(solver-email): H-083/H-084 — refined daily report + live report page |
| `6baa1e5` | chore: H-083/H-084 session documentation and Foreman handoff |
| `a92ee10` | feat(nav): move solver report pages to /solver/ and add to Dashboard nav |

---

## Files Modified

| File | Change |
|---|---|
| `layers/base/utils/reporting.ts` | Full overhaul — see below |
| `layers/base/server/api/admin/notifications/send-summary.post.ts` | Scoping bug fix + new data fields |
| `layers/base/components/AppNavigation.vue` | Dashboard nav now has children: Daily Report + Report Guide |
| `tests/unit/base/reporting.test.ts` | 21 new tests for `generateHighFidelityHtmlReport` |

## Files Created

| File | Purpose |
|---|---|
| `scripts/preview-email.ts` | Local HTML preview with 5-property mock data |
| `layers/admin/server/api/solver/email-preview.get.ts` | GET route → HTML for latest completed run |
| `layers/admin/pages/solver/report.vue` | Live report page at `/solver/report` |
| `layers/admin/pages/solver/report-help.vue` | Context guide at `/solver/report-help` |

---

## reporting.ts — Changes

### Removed
- `renderStatCard()` + "System Overview - Details" stat cards — redundant with Property Breakdown
- `renderAvailabilitiesSection()` — stub that added zero value
- `renderLeaseSignedRow()` + `lease_signed` section — dead event type never emitted by solver

### Added
- `👤 New Residents` event table (`new_tenancy` events → Resident / Unit / Property / Status / Move-In)
- Individual resident detail rows in Notices section (previously a "coming soon" placeholder)
- New exported interfaces: `SnapshotDelta`, `PropertySnapshotDeltas`, `PropertyRenewalCounts`, `PropertyRenewalCountsMap`
- `OperationalSummary.workOrders.overdueOpen?: number`
- `OperationalSummary.delinquencies.amount30Plus?: number`
- `renderDelta(delta, invert?)` + `renderRentDelta(delta)` — color-coded delta badges
- Header action buttons: `📊 Live Report →` → `/solver/report` and `❓ Report Guide` → `/solver/report-help` (only when `baseUrl` provided)

### Restructured Property Cards
Each property card now has two modules:
- **Availabilities**: Available Units (snapshot count + delta), Applications, Notices, Avg Contracted Rent (snapshot + delta)
- **Renewals**: Offer Pending (amber), Awaiting Response (indigo), Completed This Run (green)

### Email Section Order
① Property Breakdown → ② Operational Summary (conditional) → ③ Today's Activity → ④ Technical Health

---

## send-summary.post.ts — Changes

### Bug Fix: Operational Summary Scoping
Previously all 4 operational queries omitted `property_code` from `.select()`, making per-recipient filtering impossible. All recipients received the same full-portfolio summary. Fixed by:
- Adding `property_code` to every `.select()`
- Moving operational summary computation inside the per-recipient `for` loop
- Filtering data subsets `ra`, `rwo`, `rmr`, `rd` per recipient's property list

### New Data
- `availability_snapshots` query (today + yesterday dates) → `allSnapshotDeltas` → scoped per recipient
- `renewal_worksheet_items` query (status `pending` + `offered`) → `allRenewalCounts` → scoped per recipient
- `call_date` added to work orders select; `overdueOpen` = WOs open > 3 days (not 30)
- `days_31_60`, `days_61_90`, `days_90_plus` added to delinquencies select; computes `amount30Plus`
- `created_at` added to work orders select; `newToday` now accurately computed (was hardcoded 0)

### Fixes
- Email subject uses `run.upload_date` (was `new Date()` — wrong when sent after midnight)
- All "today" date comparisons use `uploadDateStr` derived from `run.upload_date`

---

## email-preview.get.ts

GET `/api/solver/email-preview`
- Fetches latest `status = 'completed'` solver run
- Runs all operational queries in parallel via `Promise.all`
- Builds snapshot deltas, renewal counts, operational summary
- Returns `{ html, run }` — no email sending

---

## Access Model

| Page | URL | Access |
|---|---|---|
| Live Report | `/solver/report` | All authenticated users (no admin middleware) |
| Report Guide | `/solver/report-help` | All authenticated users (no admin middleware) |

Files live in `layers/admin/pages/solver/` — admin layer but no access gate.
The `admin` middleware (`layers/admin/middleware/admin.ts`) is opt-in per page. Neither new page declares it.

---

## Navigation

Dashboard nav item converted to dropdown:
- **Dashboard** → `/`
- **Daily Report** → `/solver/report`
- **Report Guide** → `/solver/report-help`

Visible to all authenticated users.

---

## Tests

```
793 tests passing across 31 files
```

New test coverage in `reporting.test.ts` (42 total, 21 new):

| Group | Count |
|---|---|
| generateHighFidelityHtmlReport — structure | 5 |
| generateHighFidelityHtmlReport — event tables | 7 |
| generateHighFidelityHtmlReport — notices | 4 |
| generateHighFidelityHtmlReport — operational summary | 5 |
| generateHighFidelityHtmlReport — property filtering | 1 |
| generateHighFidelityHtmlReport — snapshot deltas | 6 |
