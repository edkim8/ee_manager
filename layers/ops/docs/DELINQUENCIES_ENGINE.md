# Delinquencies Engine & Dashboard

Comprehensive technical documentation for the delinquency tracking system within EE Manager.

## 1. Architecture Overview

The Delinquencies Engine follows an **Immutable History** pattern. Instead of updating balances in-place, the system deactivates old records and inserts new ones whenever a balance change is detected. This allows for historical trend reconstruction at any point in time.

### Key Components

- **Database**: `delinquencies` table with `is_active` flag and `created_at` snapshots.
- **Sync Layer**: `useDelinquenciesSync.ts` (Parses Yardi reports and reconciles with DB).
- **Analytics Layer**: SQL Views and RPC functions for daily/monthly aggregation.
- **Dashboard**: `delinquencies.vue` (Visual tracking of debt aging and collection trends).

---

## 2. Database Schema

### Table: `public.delinquencies`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary Key. |
| `property_code` | `char(2)` | Property identifier. |
| `tenancy_id` | `text` | Foreign key to `tenancies.id`. |
| `total_unpaid` | `numeric` | Cumulative debt. |
| `days_0_30`...`90_plus` | `numeric` | Aging buckets. |
| `is_active` | `boolean` | `true` if this is the latest known state. |
| `created_at` | `timestamptz` | Date of the report upload. |

---

## 3. Sync Logic (`useDelinquenciesSync`)

The sync process is designed for high reliability and massive datasets.

### Reliability Features
1.  **Paginated Validation**: Supabase/PostgREST defaults to 1,000 rows. The sync engine implements a Recursive Paginated Fetch to retrieve ALL registered `tenancy_id`s before processing.
2.  **Stable Ordering**: Uses `.order('id')` during pagination to ensure no rows are skipped during large fetches.
3.  **Pre-Validation**: Incoming records are matched against a `Set` of valid `tenancy_id`s. Any record not present in the master roster is skipped to prevent Foreign Key violations.
4.  **Immutable Transition**:
    - If a resident has an existing active record:
        - If balances match: **Skip** (Efficiency).
        - If balances differ: **Deactivate old / Insert new** (History).

---

## 4. Analytics & SQL Layer

### Summary View: `view_delinquencies_current_summary`
Aggregates only `is_active = true` records to show the "State of Today".

### Daily Trend View: `view_delinquencies_daily_trend`
Aggregates all daily snapshots for the trailing 30 days. This powers the high-resolution "Dot Chart".

### Historical Function: `get_delinquencies_monthly_26th_snapshots`
Reconstructs the property state as of the **26th 23:59:59** for past months.
- **Logic**: For each month, it identifies the latest delinquency record created ON or BEFORE the 26th for every unique resident.

---

## 5. Dashboard UI (`delinquencies.vue`)

### Aging Buckets Bar
A custom, gapless progress bar displaying the percentage distribution of debt across aging categories.

### Daily Delinquency Trend
An SVG-based line chart that renders a specific data point for every single day an upload occurred.
- **Visuals**: Primary color line with interactive dots.

### Monthly Benchmarks
A benchmark chart showing "End of Cycle" totals for the 26th of each month, used for long-term collection performance reviews.

### Table Engine Integration
Powered by `GenericDataTable`, leveraging `CellsCurrencyCell` and `CellsDateCell` for standardized financial formatting.
