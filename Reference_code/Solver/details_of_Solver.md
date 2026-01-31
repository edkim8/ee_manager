# 🧠 Details of Solver: Knowledge Transfer for Claude Coder

**Date:** 2026-01-27
**Status:** Transition Handover
**Source:** Leasing Agent (Antigravity)

## 1. Executive Summary
The "Solver" is a multi-source reconciliation engine designed to ingest disparate, "messy" Yardi Excel reports and synthesize them into a single, high-fidelity source of truth for the Leasing Domain. It is built on the philosophy of **"Absolute Truth Alignment"**, rejecting fuzzy logic in favor of rigid, report-specific parsing and deterministic reconciliation rules.

---

## 2. Core Architecture

### 2.1 The Two-Phase Pipeline
1.  **Phase 1: The Rigid Parser (`legacy_parser.ts`)**
    *   **Goal**: Extract raw Excel data into a standardized `import_staging` schema without "guessing".
    *   **Philosophy**: "Rigid Handshake". Each report type (Residents, Availables, etc.) has its own strict header mapping.
    *   **Mechanism**:
        *   Determines Report Type by filename pattern.
        *   Maps specific headers (e.g., "Code", "Resident Code") to Logical Fields (e.g., `res_code`, `unit_num`).
        *   **CRITICAL FIX**: Scans the *entire* file for Property Codes (e.g., "Stonebridge", "Citiview") to handle multi-property reports. (See `PARSING_AUDIT.md` for the "Row Limit" bug fix).

2.  **Phase 2: The Solver (`multi_source_solver.ts`)**
    *   **Goal**: Reconcile the 8 disparate sources into a coherent relational model (Tenancies, Residents, Leases, Units).
    *   **Logic**:
        *   **Tenancy Centric**: A "Tenancy" is defined as a unique `Unit` + `Primary Resident` pair.
        *   **Household Linking**: Roommates and Occupants are linked to the Primary Resident's Tenancy.
        *   **State Machine**: Determines the status of a Unit (Vacant, Notice, Occupied) based on the *intersection* of lease dates and physical occupancy.

---

## 3. The 8-Report Protocol (The Data Sources)

We ingest 8 specific Yardi reports, each serving as the "Source of Truth" for a specific domain slice:

| Report Name | Role | Critical Data extracted |
| :--- | :--- | :--- |
| **Residents_Status** | **The Anchor** | Defines `Tenancy Identity`, `Role` (Primary/Roommate), `Move-Out Date`. |
| **Leased_Units** | **The Auditor** | Validates Occupancy Counts (Occupied, Notice, Vacant). |
| **ExpiringLeases** | **Financials** | Source for `Actual Rent`, `Deposit`, `Lease Terms`. |
| **Availables** | **Inventory** | Source for `Offered Rent` (Market Pricing) and `Amenities` parsing. |
| **Applications** | **Screening** | Tracks `Applicants` (Guests), `Screening Results`. |
| **MakeReady** | **Maintenance** | Tracks `Date Ready` for turnover. |
| **Notices** | **Intent** | Secondary confirmation of "Notice" status and dates. |
| **Transfers** | **The Bridge** | links `From Unit` to `To Unit` for internal moves. |

---

## 4. Key Domain Rules (The "Bible")

### 4.1 Unit Identification
*   **Composite Key**: Units are NOT unique by number alone (e.g., Building 1, Unit 101 exists in both Stonebridge vs Residences).
*   **Constraint**: `Property Code` + `Unit Number` is the composite Unique Identifier.
*   **Normalization**: The Parser must strip property prefixes (e.g., "SB 1001" -> "1001") to match the clean Unit ID.

### 4.2 Residents vs. Tenancies
*   **Primary Rule**: Every valid lease has EXACTLY ONE Primary Resident.
*   **Tenancy ID**: Derived from `res_code` of the Primary Resident.
*   **Validation**: If a unit has 2 residents but 0 Primaries (only Roommates) -> **Data Error**.

### 4.3 Date Truths
*   **Lease End != Move Out**: A resident can stay past their lease end (Month-to-Month).
*   **Truth Hierarchy**: 
    1.  **Move-Out Date** (Physical vacating) is the supreme truth for Availability.
    2.  **Lease End Date** (Contractual) is financial truth but NOT availability truth.
    3.  **Ready Date** (Maintenance) determines when a unit is sellable.

### 4.4 Reconciliation Logic
*   **The "Notice Rented" Gap**: Be aware of units with status "Notice Rented". This means:
    *   1 Old Resident (Status: Notice) is still physically there.
    *   1 New Resident (Status: Future/Applicant) has signed a lease.
    *   **Solver Challenge**: Ensure *both* residents exist in the DB without colliding on the Unit ID.

---

## 5. Technical specifics & "Gotchas"

### 5.1 Parsing (Legacy Parser)
*   **Header Variations**: Yardi headers drift (e.g., "Resident Code" vs "Code" vs "Guest ID").
*   **Solution**: We maintain a strict `PARSING_AUDIT.md` ledger. Do NOT guess headers. Use the audit trail.
*   **Noise**: Report titles and subtotals must be filtered out. (Logic: "If Row matches Property Code pattern, it's noise").

### 5.2 Database Schema (`logical_staging` vs `public`)
*   **Staging**: `import_staging` table contains raw, string-based data.
*   **Production**: `tenancies`, `residents`, `leases` tables constrain types (Dates, Enums).
*   **Fallback Strategy**: To satisfy non-null DB constraints (like `leases.end_date`), the Solver uses fallbacks (e.g., `2099-12-31`) if source data is missing.

---

## 6. Current Status & Next Steps

*   **Status**: The Rigid Parser is stable. The Solver core logic is implemented but requires verification of the "Notice Rented" reconciliation.
*   **Immediate Action Item**: Validate that the Parser's "Property Discovery" fix (removing the 10-row limit) has fully resolved the missing lease counts.

---
**See Also:**
*   `layers/leasing/docs/archive/SOLVER_FOUNDATION.md`
*   `layers/leasing/docs/archive/LEASING_DOMAIN_BIBLE.md`
*   `layers/leasing/docs/archive/PARSING_AUDIT.md`
