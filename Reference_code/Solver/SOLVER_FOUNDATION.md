# 🏗️ SOLVER FOUNDATION: THE ABSOLUTE TRUTH (SUMMARY)

This is the summarized reference guide for the Leasing "Puzzle" Solver. For granular details on unit numbering, lifecycle nuances, and date independence, refer to the [LEASING_DOMAIN_BIBLE.md](LEASING_DOMAIN_BIBLE.md).

---

## 🧩 1. RIGID TRANSFORMATION LAYER
Disparate Yardi reports are transformed into **Logical Staging Columns** before processing.

| Report | Truth Type | Key Logical Fields |
| :--- | :--- | :--- |
| **Residents_Status** | **Anchor**. Roles & Tenancies. | `Primary`, `Roommate`, `Unit Status`. |
| **Leased_Units** | **Auditor**. Occupancy counts. | `Notice_Rented`, `Notice_Unrented`. |
| **ExpiringLeases** | **Financials**. History & Terms. | `Actual Rent`, `Deposit`. |
| **Availables** | **Inventory**. Pricing & Features. | **Offered Rent**, **Amenities** (Parsed). |
| **Applications** | **The Screening**. Discovery & Process. | `Agent`, `App Date`, `Screening Result`. |
| **MakeReady** | **Maintenance**. Turnover. | `Date Ready`. |
| **Notices** | **Intent**. Secondary Dates. | Prospective Move-Out Date. |
| **Transfers** | **The Bridge**. Identity transfers. | From/To Unit Codes. |

---

## 🏛️ 2. IDENTITY: THE 1:1 PRIMARY RULE
- **The Anchor**: A Tenancy is anchored by **One Primary Resident** (`res_code`).
- **Identity Locking**: Household members (Roommates/Occupants) are linked to the Primary and follow their lifecycle (Current -> Past).
- **Arbitration**: If a Tenancy has Zero Primaries -> `[ARBITRATION ERROR]`.

---

## 📊 3. THE ABSOLUTE RECONCILIATION
The Solver MUST match Yardi counts exactly by handling **Dual-Occupancy**.

- **Goal**: Account for every resident in the Notice/Future pipeline.
- **The Equation**: `Residents.Notice (55)` == `Leased.Notice_Unrented (41)` + `Leased.Notice_Rented (14)`.
- **Logic**: `Notice Rented` units house both an outgoing (Notice) and incoming (Future/Applicant) resident.

---

## 📅 4. THE 4 TRANSITION STATES
Truth is derived from the **Move-Out (MO) Date**, NOT the Lease End date.

1.  **Current**: MO Date is `NULL`.
2.  **Notice**: MO Date is `FUTURE` (Resident-initiated).
3.  **Eviction**: MO Date is `FUTURE` (Owner-initiated).
4.  **Past**: MO Date is `PAST`.

---

## 🛠️ 5. RIGID PARSER MANIFESTO
- **Amenities Parsing**: Found in `Availables`. Must split `<br>` separated strings into individual items.
- **Rent Differentiation**: Distinguish `Actual Rent` (ExpiringLeases) from `Offered Rent` (Availables).
- **Explicit Redundancy**: No global maps. Each report type is mapped independently by content/meaning.
