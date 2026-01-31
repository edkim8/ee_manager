# Solver Schema Design & Implementation Plan

## Goal
Implement a robust relational database schema to support the "Solver" engine, enabling the reconciliation of Yardi reports into a "Single Source of Truth".
**Strategy Update**: We are adopting a **Hybrid/Incremental** approach. Instead of requiring all 8 reports simultaneously, the system will process reports sequentially to build and enrich the database.

## Business Rules (The "Puzzle" Solution)

### 1. Tenancy ID Definition
*   **Concept**: A `Tenancy` is a unique pair of **Primary Resident + Unit**.
*   **Transfer Rule**: If a Resident moves from Unit A to Unit B, Yardi generates a **NEW** `tenancy_id`. We must respect this and treat it as a new Tenancy record, not an update to the old one.

### 2. The "Status vs Role" Logic (Residents_Status)
The `status` column in `Residents_Status` is overloaded. It contains both **Tenancy Status** AND **Household Role**.

*   **Role Detection**:
    *   IF `status` IN `['Roommate', 'Occupant']` -> **Role** is `household_member`. The "True Status" of the tenancy is inherited from the Primary Resident.
    *   ELSE -> **Role** is `primary`.
*   **True Status**:
    *   For Primary Residents, the `status` field reflects the actual Tenancy state: `['Current', 'Notice', 'Future', 'Applicant', 'Eviction']`.
    *   **Filter**: We only process residents with these active states (ignoring `Past`, `Canceled`, `Denied` unless explicitly needed for history).

### 3. Data Ingestion Logic (The Tenancy-First Flow)
**Logic**: We use the `tenancy_id` as the primary signal for "New vs Update".

1.  **Read Row**: `[Tenancy_ID: T1, Resident: John Doe, ...]`
2.  **Check Tenancy**: Does `T1` exist in the `tenancies` table?
3.  **Branch A: IT EXISTS (Update Mode)**
    *   This is just a status change or data refresh.
    *   Update `tenancies` (Status, Dates).
    *   Update `residents` (Phone/Email) via the linked `primary_resident_id`.
4.  **Branch B: IT IS MISSING (New Insert Mode)**
    *   **Step B1 (The Person Resolution)**:
        *   **Problem**: We lack a unique "Person ID" in the source (only `tenancy_id` exists).
        *   **Solution (Fuzzy Match)**: Check `residents` table for a match on **(Name + Email)** OR **(Name + Phone)**.
        *   *Transfers*: If `5p_Transfers` indicates a move, we explicitly link the new Tenancy to the existing Resident UUID.
        *   **Result**: Get `resident_UUID` (Found or Created).
    *   **Step B2 (The Tenancy)**:
        *   Insert `tenancies` using the UUID from B1 as `primary_resident_id`.

## User Review Required
> [!IMPORTANT]
> **Order of Operations**: The system will enforce a strict upload order. `Residents_Status` is the "Anchor" that MUST be processed first to establish Tenancies. Subsequent reports (like `ExpiringLeases` or `Availables`) will *enrich* existing records rather than creating new ones (unless specific criteria are met).

## Proposed Schema Changes

### 1. Staging Layer (`import_staging`)
Remains the entry point. The Solver processes rows from here one batch at a time.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | PK |
| `batch_id` | UUID | Group ID |
| `report_type` | ENUM | `residents_status`, `leased_units`, etc. |
| `raw_data` | JSONB | |
| `property_code` | TEXT | |
| `processed_at` | TIMESTAMPTZ | **New**: Tracks when this row was successfully reconciled into Production tables. |
| `error_log` | TEXT | **New**: If processing failed. |

### 2. Production Layer (The Final "Tenancy Roster" Model)

#### `tenancies`
**The Container**. Use Yardi's `tenancy_id` as the Primary Key.
*   **Note**: No direct link to Resident. The link is "Reverse" (Resident -> Tenancy).

| Column | Type | Nullable | Notes |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | No | **PK**: The Yardi `tenancy_id` (e.g., `t0012345`). |
| `property_code` | TEXT | No | Scoped Index. |
| `unit_id` | UUID | No | **FK**: Link to `units`. |
| `status` | ENUM | No | `current`, `notice`, `eviction`... |
| `move_in_date` | DATE | Yes | |
| `move_out_date` | DATE | Yes | **Supreme Truth** availability. |

#### `residents`
**The Participants**. All people (Principals + Roommates).
*   **Link**: `tenancy_id` connects them to the lease.
*   **Role**: Distinguishes 'Head of Household' from 'Occupants'.

| Column | Type | Nullable | Notes |
| :--- | :--- | :--- | :--- |
| `id` | UUID | No | Internal PK. |
| `property_code` | TEXT | No | Scoped Index. |
| `tenancy_id` | TEXT | No | **FK**: Link to `tenancies`. |
| `name` | TEXT | Yes | |
| `role` | ENUM | No | `Primary`, `Roommate`, `Occupant`. |
| `is_active` | BOOL | No | |

#### `leases`
Financial terms linked to the Tenancy.

| Column | Type | Nullable | Notes |
| :--- | :--- | :--- | :--- |
| `id` | UUID | No | Internal PK. |
| `tenancy_id` | TEXT | No | **FK**: Links to `tenancies.id`. |
| `rent` | NUMERIC | Yes | |

### 3. The Hybrid "Solver" Logic

A stateful processor that knows how to handle each report type in isolation.

#### **Step 1: The Anchor (`Residents_Status`)**
*   **Action**: Upsert `residents` and `tenancies`.
*   **Logic**:
    *   Find Resident by `yardi_res_code`. If not found, create.
    *   Find Unit by `property_code` + `unit_name`.
    *   Find Active Tenancy for (Resident + Unit). If not found, create.
    *   Update Status and Dates.

#### **Step 2: The Financials (`ExpiringLeases`)**
*   **Action**: Update `leases` and Enrichment.
*   **Logic**:
    *   **MUST** find existing Tenancy (via `t_code` or Unit/Name match).
    *   If found: Update `rent_amount`, `deposit`, `lease_dates`.
    *   If NOT found: Log "Orphan Lease" warning (or create skeleton tenancy if we trust this report as a secondary anchor).

#### **Step 2A: The Intent (`5p_Notices`)**
*   **Source**: `5p_Notices`.
*   **Logic**:
    *   Find Tenancy (via Unit/Resident).
    *   Update `status` = 'Notice'.
    *   Update `move_out_date` = 'Move Out Date' from report.
    *   *Note*: This sets the "Predicted Availability".

#### **Step 2B: The Confirmation (`Residents_Status`)**
*   **Logic**:
    *   If `Residents_Status` also has a move-out date, it **overwrites** the Notice date (it is usually more current).
    *   If `Residents_Status` shows resident is gone (Status=Past), we close the tenancy.

#### **Step 2C: The Turn (`5p_MakeReady`)**
*   **Source**: `5p_MakeReady`.
*   **Logic**:
    *   Presence in this file = **"Vacant Not Ready"**.
    *   `make_ready_date` = scheduled completion.
    *   **Overdue Logic**: If `make_ready_date` < TODAY and unit is STILL in this report -> **Flag as Overdue** in `availabilities`.
    *   *Removal*: When unit disappears from this report (and is still vacant) -> Status becomes **"Vacant Ready"**.

#### **Step 2D: The Pipeline (`5p_Applications`)**
*   **Source**: `5p_Applications`.
*   **Purpose**: Tracks future residents and manages the leasing workflow.
*   **Logic**:
    *   **Workflow Management**: Create records in the `applications` table.
    *   **Alerts**: If `application_date` > 5 days ago and Status != 'Closed', flag as **Overdue**.
    *   **Dashboarding**:
        *   Update `availabilities.screening_result` (e.g. "Approved").
        *   Update `availabilities.agent` -> Assigns responsibility.

#### **Step 2E: The Bridge (`5p_Transfers`)**
*   **Source**: `5p_Transfers`.
*   **Purpose**: Linking two separate Tenancy IDs to the same Human.
*   **Logic**:
    *   **Action**: Use this report to confirm that Resident X in Tenancy A is the SAME person as Resident X in Tenancy B.
    *   **Execution**: When creating the new Tenancy (B), look up the `resident_id` from Tenancy A instead of creating a new UUID.

#### **Step 3: The Auditor (`Leased_Units`)**
*   **Action**: Validation only.
*   **Logic**:
    *   Compare `count(occupied_units)` in DB vs Report.
    *   Flag discrepancies.

### 5. Inventory Layer (`availabilities`)
A "Snapshot" table separate from Units/Tenancies, optimized for Marketing & Operations.
*   **Refinement**: 1:1 with `units`. Stores calculated dates for metrics.

| Column | Type | Nullable | Notes |
| :--- | :--- | :--- | :--- |
| `unit_id` | UUID | No | **PK/FK**: Link to `units`. |
| `property_code` | TEXT | No | |
| `status` | ENUM | Yes | 'Vacant Ready', 'Vacant Not Ready', 'Occupied'... |
| `unit_name` | TEXT | Yes | |
| `available_date` | DATE | Yes | Marketing Availability Date. |
| `move_out_date` | DATE | Yes | **Previous** Resident Move Out. |
| `move_in_date` | DATE | Yes | **Future** Resident Move In (if leased). |
| `ready_date` | DATE | Yes | From `MakeReady`. |
| `rent_market` | NUMERIC | Yes | |
| `rent_offered` | NUMERIC | Yes | |
| `amenities` | JSONB | Yes | Unit Amenities / Concessions. |
| `leasing_agent` | TEXT | Yes | From `Applications`. |
| `future_tenancy_id` | TEXT | Yes | **FK**: Link to Future/Applicant Tenancy. |
| `is_mi_inspection` | BOOL | Yes | Move-In Inspection Status. |
| `screening_result` | TEXT | Yes | From `Applications`. |
| `updated_at` | TIMESTAMP | No | |

### 5B. Metrics View (`view_availabilities_metrics`)
Calculates operational metrics dynamically.
*   **Logic**:
    *   `turnover_days` = `ready_date` - `move_out_date`.
    *   `vacant_days`: `(move_in_date OR Today)` - `move_out_date`.
    *   `operational_status`: Uses `future_tenancy_id -> status` to determine [Available, Applied, Leased].

### 6. Process Layer (`applications`)
New table to track the "Work in Progress".

| Column | Type | Nullable | Notes |
| :--- | :--- | :--- | :--- |
| `id` | UUID | No | PK |
| `property_code` | TEXT | No | |
| `unit_id` | UUID | Yes | FK to `units` |
| `applicant_name` | TEXT | No | Raw string (until they become Resident) |
| `agent` | TEXT | Yes | Responsible party |
| `application_date` | DATE | No | |
| `status` | TEXT | No | 'Pending', 'Approved', 'Canceled' |
| `is_overdue` | BOOL | No | Calc: `(Now - app_date) > 5 days` |

## Verification Plan
1.  **Mock Test**: Simulate the sequence:
    *   Upload `Residents_Status` -> Check DB.
    *   Upload `ExpiringLeases` -> Check DB updates (Rent added).
    *   Upload `Availables` -> Check Unit updates.
2.  **Schema Check**:
    *   Verify `availabilities.amenities` supports JSONB.
    *   Verify `view_availabilities_metrics` correctly calculates `turnover_days`.
3.  **UI Check**:
    *   Drop files on `/admin/solver` and verify identification.

### 7. Type Synchronization (`types/supabase.ts`)
Since we cannot run `supabase gen types` against the production database directly in this environment, we employ a **Manual Type Sync** strategy.
*   **Location**: `types/supabase.ts`.
*   **Strategy**:
    *   **Tables**: Manually define `Row`, `Insert`, `Update` interfaces for `tenancies`, `residents`, `leases`, `availabilities`, `applications`, `import_staging`.
    *   **Enums**: Manually sync `tenancy_status`, `household_role`, `lease_status`, `import_report_type`.
    *   **Views**: Manually define `view_availabilities_metrics`.
*   **Maintenance**: Any change to `20260128000000_solver_schema.sql` MUST be mirrored in `types/supabase.ts`.
