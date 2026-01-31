# 📖 THE LEASING DOMAIN BIBLE (v1.1)

This is the **Absolute High-Fidelity Truth**. It contains the granular details required to build a "Smart" system on top of "Messy" Yardi reports.

---

## 🏗️ 1. ARCHITECTURE OF A UNIT
Unit IDs in Yardi follow specific property-level patterns.

| Property | Symbol | Identifier Logic | Floor Logic |
| :--- | :--- | :--- | :--- |
| **Stonebridge** | `SB` | 4 Digits (e.g. `1234`) | 1st digit = Floor. (e.g., `1111` = Unit 111, Floor 1) |
| **Residences** | `RS` | 4 Digits (e.g. `1234`) | 1st digit = Floor. (e.g., `2222` = Unit 222, Floor 2) |
| **Citiview** | `CV` | `C` + 3 Digits (e.g. `C101`) | 1st digit = Floor. Only property with `C` prefix. |
| **Ocean Breeze**| `OB` | `S` + 3 Digits (e.g. `S101`) | No floor indicator in unit code. All digits = Unit. |
| **Willow Oak** | `WO` | `NNN-A` (e.g. `101-A`) | Building (3 digits) + Unit (Letter). No floor indicator. |

> [!NOTE]
> **Unit Uniqueness**: `SB` and `RS` unit codes are NOT globally unique (both can have `1111`). We must always anchor by `Property_Code + Unit_Code`.

---

## 🏛️ 2. IDENTITY: RESIDENTS VS TENANCIES
Yardi uses `Resident Code` (e.g., `t1234567`) as the primary key.

- **The Tenancy (`res_code`)**: Represents a unique combination of a **Resident (Primary)** and a **Unit**.
- **The Household**: A Tenancy contains one Primary resident and multiple Household Members (Roommates/Occupants).
- **Lifecycle Correlation**: Household members follow the lifecycle of their Primary resident. If the Primary moves out (Tenancy -> Past), the linked members are also retired to 'Past'. 
- **Resident Name**: Treat as **Flexible Text**. Standard is `Last, First` but can include Corporate Names, "(Minor)", and multi-word names. No rigid decoding.

---

## 📊 3. THE 8-REPORT PROTOCOL

| Report | Role / Truth Source | Critical Fields |
| :--- | :--- | :--- |
| **Residents_Status** | **The Anchor**. Role & State. | Tenancy ID, Role, Move-Out, Unit Status. |
| **Leased_Units** | **The Auditor**. Occupancy counts. | Unit Status (e.g., "Notice Rented"). |
| **ExpiringLeases** | **The Financials**. History & Terms. | Rent, Deposit, MO Date. (MO > Expire = MTM). |
| **Availables** | **The Inventory**. Offered prices. | **Offered Rent** (Base + Concession), **Amenities**. |
| **MakeReady** | **The Maintenance**. Turnover. | **Date Ready**. Alerts if Overdue. |
| **Notices** | **The Intent**. Secondary Dates. | Prospective Move-Out Date. |
| **Applications** | **The Screening**. Discovery & Process. | Agent, Guest (New Resident), App Date, Screening Update, Screening Result. |
| **Transfers** | **The Bridge**. Identity transfers. | From-Unit to To-Unit. |

---

## 🌳 4. THE 4 TRANSITION STATES OF THE UNIT (`5p_Leased_Units`)
The **Audit Source** for counting the "Pipeline".

- **Occupied No Notice**: Standard Current resident.
- **Notice Unrented**: Old resident is moving out; unit is available for new lease.
- **Notice Rented (Double Occupancy)**: Old resident still in unit (Notice) + New resident signed (Future/Applicant).
- **Vacant Rented (Ready/Not Ready)**: Unit is physically empty but reserved for a New resident (Future/Applicant).

---

## 📅 5. THE TRUTH ABOUT DATES
Avoid the "Lease Equality" fallacy. These dates are independent business inputs.

- **Lease Start**: Legally when the contract begins.
- **Move-In**: Physically when the resident takes possession. (Move-In >= Lease Start).
- **Lease End**: Legally when the contract expires.
- **Move-Out**: Physically when the resident vacates. 
    - **Early Move-Out**: Move-Out < Lease End.
    - **Month-to-Month (MTM)**: Resident stays past Lease End with no specific Move-Out date (MO is Null).
- **Available Date / MakeReady Date**: Internal maintenance targets for the next resident.

---

## 🧺 6. AMENITIES & RENT
- **Amenities**: Found in `5p_Availables`. Must be parsed from `<br>` separated strings into individual items for storage.
- **Offered Rent**: Found in `5p_Availables`. This is the "Marketing Rent" (Base + Concessions/Premiums), distinct from the "Actual Rent" in `ExpiringLeases`.
