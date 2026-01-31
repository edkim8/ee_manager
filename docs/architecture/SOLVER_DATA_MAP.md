# Solver Data Map

## 1. Data Source Inventory

| File | Interface | Key Fields |
| :--- | :--- | :--- |
| `useParseApplications.ts` | `ApplicationsRow` | `leasing_agent`, `applicant`, `application_date`, `property_code`, `unit_name`, `screening_result`, `screening_last_updated` |
| `useParseAvailables.ts` | `AvailablesRow` | `property_code`, `unit_name`, `floor_plan`, `bedroom_count`, `offered_rent`, `available_date`, `days_vacant`, `sqft`, `status`, `amenities` |
| `useParseExpiringLeases.ts` | `ExpiringleasesRow` | `unit_name`, `floor_plan`, `status`, `market_rent`, `sqft`, `deposit`, `tenancy_code`, `resident`, `lease_rent`, `lease_start_date`, `lease_end_date`, `move_out_date`, `phone` |
| `useParseLeasedunits.ts` | `LeasedunitsRow` | `property_code`, `unit_name`, `floor_plan`, `unit_status`, `resident` |
| `useParseMakeready.ts` | `MakereadyRow` | `property_code`, `bedrooms`, `rent`, `sqft`, `make_ready_date`, `unit_name`, `status` |
| `useParseNotices.ts` | `NoticesRow` | `move_out_date`, `property_code`, `unit_name`, `resident`, `status` |
| `useParseResidentsStatus.ts` | `ResidentsStatusRow` | `property_code`, `unit_name`, `tenancy_id`, `type`, `resident`, `rent`, `deposit`, `status`, `lease_start_date`, `lease_end_date`, `move_in_date`, `move_out_date`, `phone`, `email` |
| `useParseTransfers.ts` | `TransfersRow` | `from_property_code`, `from_status`, `from_unit_name`, `resident`, `to_unit_name`, `to_property_code`, `to_status` |

## 2. The "Tenancy ID" Hunt

Critical for linking data to specific tenancies. This identifier allows us to deduplicate residents and link them to specific lease terms.

*   **`useParseExpiringLeases.ts`**: Contains `tenancy_code` (Mapped from 'Resident Code').
*   **`useParseResidentsStatus.ts`**: Contains `tenancy_id` (Mapped from 'Code').

**Observation**: `ResidentsStatus` and `ExpiringLeases` are the primary sources for establishing the "Tenancy" entity. Other reports rely on loose matching via `unit_name` + `resident` name.

## 3. The "Resident" Hunt

Reports containing Resident names, emails, or phones.

*   **`useParseResidentsStatus.ts`**: **The "Gold Mine"**. Contains `resident`, `phone` (Home, Mobile, Office merged), and `email`.
*   **`useParseExpiringLeases.ts`**: Contains `resident` and `phone`.
*   **`useParseApplications.ts`**: Contains `applicant`.
*   **`useParseLeasedunits.ts`**: Contains `resident`.
*   **`useParseNotices.ts`**: Contains `resident`.
*   **`useParseTransfers.ts`**: Contains `resident`.

## 4. The "Status" Hunt

Reports providing status context (Unit vs Resident vs Lease).

*   **`useParseAvailables.ts`**: `status` (Occupancy).
*   **`useParseExpiringLeases.ts`**: `status` (Resident Status).
*   **`useParseLeasedunits.ts`**: `unit_status`.
*   **`useParseMakeready.ts`**: `status` (Occupancy).
*   **`useParseNotices.ts`**: `status` (Notice Status).
*   **`useParseResidentsStatus.ts`**: `status` (Resident Status, e.g. "Current", "Past", "Notice").
*   **`useParseTransfers.ts`**: `from_status`, `to_status` (Resident status change).
*   **`useParseApplications.ts`**: `screening_result` (Applicant status).

## 5. The Data Overlap Matrix (The Proof of Duplication)

This matrix confirms your hypothesis: **Data is highly duplicated across reports**, allowing us to choose the "Best Source" for each field while using others for verification.

| Field | Residents | Expiring | Leased | Availables | MakeReady | Notices | Transfers | Applications |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Identity (Res/App)** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Unit Name** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Status** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Dates (Lease/Move)** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Financials (Rent)** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Phone/Email** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Key Takeaways:**
1.  **Identity Redundancy**: We have **6 reports** that confirm a Resident's existence. This supports the "Anchor" strategy (Source of Truth = `Residents_Status`) with robust fallback/validation.
2.  **Status Chaos**: Every single report has a "Status" concept, but they mean different things (Occupancy vs Leased vs Application). The Solver MUST translate these into a unified `tenancy_status`.

