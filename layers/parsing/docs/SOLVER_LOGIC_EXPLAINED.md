# Solver Engine Logic: The "Anchor" & "Safe Sync"

> **Status**: Draft (Phase 1)
> **Context**: Logic for synthesizing multiple Yardi reports into a single, clean "Tenancy" & "Resident" record.

## 1. The Core Philosophy
The Solver Engine is designed to be **Conservative** and **Tenancy-Centric**.
Messy data is the norm in Yardi reports. The Solver's job is to filter out the noise and only allow "Anchored" data into our database.

### Key Concepts

#### A. The "Anchor" Table
We do not blindly import every row from every file.
*   **The Anchor**: `5p_Tenancy.csv` (and `5p_Residents.csv`).
*   **The Rule**: If a record (Lease, Ledger, Charge) cannot be linked to a valid Anchor (Tenancy ID), it is **Discarded**.
*   *Why?* This prevents "Ghost Data" (charges for non-existent tenants) from corrupting the system.

#### B. The "Strict Primary" Handshake
When linking secondary tables (like `lease_charges` or `receivables`) to the Anchor:
1.  We generate a linking key (usually `tCode` or `hMyPerson`).
2.  We look up the Anchor.
3.  **Strict Mode**: If the lookup fails, we LOG a warning and SKIP the row. We never create "Placeholder" tenancies from secondary data.

#### C. "Safe Sync" (Merge Strategy)
When updating the database with new info (e.g., parsing a new "Residents" file):
*   **Non-Destructive**: We only overwrite a field if the *incoming* value is valid/non-empty.
*   **No Nulling**: An empty cell in a CSV should never wipe out existing data in the DB.
*   **Priority**:
    1.  `5p_Residents.csv` (Highest reliability for Name, Email, Phone)
    2.  `5p_Tenancy.csv` (Highest reliability for Status, Dates, Unit Code)
    3.  `5p_Lease_Charges.csv` (Financials only)

---

## 2. Phase 1: Residents & Tenancies (The Anchor)

### Data Flow
1.  **Ingest** `5p_Tenancy.csv`:
    *   Creates the "Skeleton" of the Tenancy.
    *   Key Fields: `tCode` (Tenancy ID), `sCode` (Property), `sUnitCode` (Unit), `dtMoveIn`, `dtMoveOut`.
    *   *Status Logic*: Mapped from Yardi status (Current, Past, Future) to our Enum.

2.  **Ingest** `5p_Residents.csv`:
    *   Enriches the Skeleton with "Flesh" (Personal details).
    *   Linking Key: `tCode` matches the Tenancy.
    *   Key Fields: `sFirstName`, `sLastName`, `sEmail`, `sPhone`.

### Field Mapping (Phase 1)

| Field Name | Source 1 (`Tenancy`) | Source 2 (`Resident`) | Strategy |
| :--- | :--- | :--- | :--- |
| **Tenancy ID** | `tCode` | `tCode` | Primary Key |
| **Status** | `sStatus` | - | Map to Enum |
| **Resident Name** | - | `sFirstName` + `sLastName` | Concat |
| **Email** | - | `sEmail` | Validation Required |
| **Move In** | `dtMoveIn` | - | Date Format |
| **Rent** | `dRent` | - | Parse Currency |

## 3. Phase 2: Financials (Leases) - COMPLETE ✅

### Overview
Phase 2 implements the **Leases** table and synchronization logic, linking financial data to the Anchor (Tenancies). This phase handles lease renewals, status tracking, and historical preservation.

### Key Achievements

#### A. Lease Schema & ENUMs
*   **Table**: `public.leases` with fields:
    - `tenancy_id` (FK to tenancies - The Anchor Link)
    - `start_date`, `end_date` (Lease term)
    - `rent_amount`, `deposit_amount` (Financials)
    - `lease_status` ENUM: `'Current' | 'Notice' | 'Future' | 'Past' | 'Eviction'`
    - `is_active` (Efficiency flag for current lease queries)
*   **ENUM Alignment**: Matched Yardi's lease status values exactly to prevent mapping errors.

#### B. Renewal Detection Logic
The Solver implements **3-Criteria Renewal Detection** to distinguish between:
- **New Tenancy**: First lease for a household
- **Renewal**: Same tenancy, new lease term

**Criteria**:
1.  **Tenancy Match**: Same `tenancy_id`
2.  **Date Overlap**: New `start_date` within 60 days of previous `end_date`
3.  **Status Transition**: Previous lease marked `is_active = false`, new lease marked `is_active = true`

**Why This Matters**: Prevents duplicate tenancy records and preserves lease history for reporting.

#### C. Safe Sync Pattern (UPDATE-Based)
Unlike Phase 1's INSERT-heavy approach, Phase 2 uses **UPDATE-based Safe Sync**:

```typescript
// Pseudocode Logic
for each incoming lease:
  1. Look up existing lease by (tenancy_id, start_date, end_date)
  2. If found:
     - UPDATE only if incoming data is newer/more complete
     - Preserve is_active flag unless status changed
  3. If not found:
     - Check for renewal (3 criteria above)
     - If renewal: Deactivate old lease, INSERT new lease
     - If new: INSERT new lease
```

**Benefits**:
- No data loss from re-imports
- Handles partial updates gracefully
- Maintains referential integrity

#### D. Lease History Preservation
*   **Pattern**: Never DELETE leases, only mark `is_active = false`
*   **Rationale**: Historical leases are critical for:
    - Rent trend analysis
    - Renewal rate calculations
    - Audit trails
*   **Query Optimization**: `idx_leases_active` index on `(tenancy_id, is_active)` for fast "current lease" lookups

#### E. Enriched Leases View
Created `public.leases_view` for reporting with:
- Primary resident name (from `residents` table)
- Household count (Primary + Roommates + Occupants)
- Unit name (from `units` table via `tenancies`)
- Move-in date (from `tenancies`)
- All lease financials and dates

**Usage**: Powers dashboards, expiring leases reports, and financial summaries.

### Edge Cases Handled
1.  **Duplicate Leases in Import**: Deduplicated by `(tenancy_id, start_date, end_date)` before sync
2.  **Orphaned Leases**: Leases with invalid `tenancy_id` are logged and skipped (Strict Primary)
3.  **Deposit Transformations**: Negative deposits converted to positive (Yardi quirk)
4.  **Missing Dates**: Leases with null `start_date` or `end_date` rejected with validation error

### Verification Results
✅ Parser correctly maps Yardi lease data to schema
✅ Renewal detection accurately identifies lease renewals vs new tenancies
✅ Safe Sync preserves existing data on re-import
✅ `leases_view` returns correct aggregated data
✅ Historical leases retained with `is_active = false`

---

## 4. Phase 2A: Intent (Notices) - COMPLETE ✅

### Overview
Phase 2A implements **Notices processing** to update `move_out_date` fields in both `tenancies` and `availabilities` tables. This phase links move-out intent from the Notices report to the anchor tenancy records.

### Key Achievements

#### A. Unit Resolution via Composite Keys
*   **Method**: `property_code` + `unit_name` → `unit_id` lookup
*   **Validation**: Pre-fetch existing units from database
*   **Orphan Handling**: Skip units not found in `units` table with warning

#### B. Status Validation & Auto-Fix
**Critical Rule**: Notices report is the authoritative source for move-out intent.

```typescript
// Status Auto-Fix Logic
if (tenancy.status !== 'Notice') {
    finalStatus = 'Notice'
    warnings.push(`Auto-fixed status: ${tenancy.status} → Notice`)
}
```

**Rationale**: If a notice exists in the report, the tenancy status SHOULD be 'Notice'. Auto-fixing prevents data inconsistency.

**Test Results**: 11 auto-fixes applied correctly across 61 notices:
- CV: 1 auto-fix (Future → Notice)
- RS: 8 auto-fixes (Future → Notice)  
- SB: 2 auto-fixes (Applicant → Notice)

#### C. Dual Table Updates
Updates both tables in single sync operation:
- `tenancies.move_out_date` - From Notices report
- `tenancies.status` - Auto-fixed to 'Notice' if mismatch
- `availabilities.move_out_date` - From Notices report (same unit)

**Benefits**:
- Data consistency across tables
- Single source of truth for move-out dates
- Idempotent re-imports

#### D. Schema Fixes Implemented
1.  **Removed Non-Existent Column**: Eliminated `.eq('is_active', true)` filter from tenancy queries
2.  **Fixed NOT NULL Constraints**: Added all required fields to update payloads:
    - Tenancies: `property_code`, `unit_id`, `status`
    - Availabilities: `unit_id`, `property_code`

### Edge Cases Handled
1.  **Orphan Units**: Units not in `units` table → Skipped with warning
2.  **No Active Tenancy**: Units without active tenancy → Skipped with warning
3.  **Status Mismatch**: Tenancy status ≠ 'Notice' → Auto-fixed with warning

### Verification Results
✅ Unit resolution working (61 notices processed)
✅ Status auto-fix working (11 auto-fixes applied correctly)
✅ Tenancies updated successfully
✅ Availabilities updated successfully
✅ No errors in production test across 5 properties

### Troubleshooting: Issues Resolved

#### Issue 1: Missing `is_active` Column
**Error**: `column tenancies.is_active does not exist (42703)`  
**Fix**: Removed `.eq('is_active', true)` from all tenancy queries  
**Impact**: Resolved all 400 errors

#### Issue 2: NOT NULL Constraint Violations (Tenancies)
**Error**: `null value in column "property_code" violates not-null constraint (23502)`  
**Fix**: Added `property_code`, `unit_id`, `status` to update payload  
**Impact**: Tenancies now update successfully

#### Issue 3: NOT NULL Constraint Violations (Availabilities)
**Error**: `null value in column "unit_id" violates not-null constraint (23502)`  
**Fix**: Added `unit_id`, `property_code` to update payload  
**Impact**: Availabilities now update successfully

**Key Learning**: Always include all NOT NULL fields in upsert operations, even if you're only updating one field.

---


## 5. Phase 2C: MakeReady (Unit Flags System) - COMPLETE ✅

### Overview
Phase 2C implements **MakeReady processing** with a revolutionary **unit_flags system** - a flexible, extensible infrastructure for tracking unit-level issues across the entire application.

**Critical**: The `unit_flags` table is **core infrastructure** for ALL modules, not just makeready. See [`docs/architecture/UNIT_FLAGS_GUIDE.md`](../../../docs/architecture/UNIT_FLAGS_GUIDE.md) for complete documentation.

### Key Achievements

#### A. Unit Flags System (Core Infrastructure)
**Database Table**: `public.unit_flags`

**Design Pattern**: Entity-Attribute-Value (EAV) with JSONB metadata
- **Entity**: `unit_id`
- **Attribute**: `flag_type` (extensible string)
- **Value**: `metadata` (JSONB)

**Key Features**:
- ✅ Add new flag types without schema migrations
- ✅ Rich metadata storage (JSONB)
- ✅ Severity levels (info, warning, error)
- ✅ Partial unique index (prevents duplicate active flags)
- ✅ Soft delete pattern (resolved_at)
- ✅ Audit trail (created_at, resolved_by)

**Schema**:
```sql
CREATE TABLE public.unit_flags (
    id UUID PRIMARY KEY,
    unit_id UUID REFERENCES units(id),
    property_code TEXT NOT NULL,
    flag_type TEXT NOT NULL,  -- Extensible!
    severity TEXT CHECK (severity IN ('info', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Prevents duplicate active flags per unit+type
CREATE UNIQUE INDEX idx_unit_flags_unique_active 
ON unit_flags(unit_id, flag_type) 
WHERE resolved_at IS NULL;
```

#### B. MakeReady Overdue Detection
**Logic**: Detect units past their makeready due date with 1-day cushion

```typescript
const makeReadyDate = new Date(parseDate(row.make_ready_date))
const cutoffDate = new Date(today)
cutoffDate.setDate(cutoffDate.getDate() - 1)  // 1-day cushion

const isOverdue = makeReadyDate < cutoffDate
```

**Severity Escalation**:
- **Warning**: 1-7 days overdue
- **Error**: 7+ days overdue

**Metadata Structure**:
```json
{
  "expected_date": "2026-01-16",
  "days_overdue": 15,
  "unit_name": "454-H"
}
```

#### C. Flag Creation Pattern
```typescript
const flag = {
  unit_id: unitId,
  property_code: pCode,
  flag_type: 'makeready_overdue',
  severity: daysOverdue > 7 ? 'error' : 'warning',
  title: 'MakeReady Overdue',
  message: `Unit ${row.unit_name} makeready was due on ${row.make_ready_date}`,
  metadata: {
    expected_date: row.make_ready_date,
    days_overdue: daysOverdue,
    unit_name: row.unit_name
  }
}

// Use ignoreDuplicates for partial unique index
await supabase
  .from('unit_flags')
  .insert([flag], { ignoreDuplicates: true })
```

### Verification Results
✅ 5 flags created from 80 units across 5 properties:
- CV: 2 flags (C107: 8 days error, C213: 1 day warning)
- RS: 2 flags (1062: 2 days warning, 2093: 2 days warning)
- WO: 1 flag (454-H: 15 days error)

### Troubleshooting: Issues Resolved

#### Issue 1: Date Comparison Bug
**Error**: Overdue units not being detected  
**Root Cause**: `parseDate()` returns string, but code compared string to Date object  
**Fix**: Convert string to Date object before comparison

```typescript
// Before (broken):
const makeReadyDate = parseDate(row.make_ready_date)  // Returns string
return makeReadyDate < cutoffDate  // String < Date always false

// After (works):
const makeReadyDate = new Date(parseDate(row.make_ready_date))
return makeReadyDate < cutoffDate  // Date < Date works correctly
```

#### Issue 2: Upsert Conflict Specification Error
**Error**: `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification`  
**Root Cause**: Supabase PostgREST doesn't support `onConflict` with partial unique indexes  
**Fix**: Use `insert` with `ignoreDuplicates: true` instead of `upsert`

### Future Flag Types (Extensibility)
The system is designed to accommodate:
- `inspection_pending`, `inspection_failed`
- `maintenance_required`, `maintenance_overdue`
- `pricing_anomaly`, `rent_below_market`
- `photos_missing`, `documentation_incomplete`
- `lease_expiring_soon`, `renewal_needed`
- `pest_control_needed`, `hvac_service_due`

**See [`UNIT_FLAGS_GUIDE.md`](../../../docs/architecture/UNIT_FLAGS_GUIDE.md) for complete examples and metadata structures.**

### Integration Guidelines for AI Agents

✅ **Use unit_flags for**:
- Temporary conditions that can be resolved
- Issues that need tracking and alerting
- Metadata that doesn't belong in core tables
- Cross-cutting concerns (inspections, maintenance, etc.)

❌ **Don't use unit_flags for**:
- Core business data (use proper tables)
- Permanent attributes (add columns to units table)
- High-frequency updates (use caching layer)

**Adding New Flag Types**: No schema changes needed - just start inserting with new `flag_type` and document in the guide.

---


## 6. Phase 2D: Applications (Leasing Pipeline) - COMPLETE ✅

### Overview
Phase 2D implements **Applications processing** to save application data, update availability records with leasing agents, and create overdue flags for pending screening results.

### Key Achievements

#### A. Unit Resolution & Availability Updates
**Method**: Composite key lookup + availability matching

```typescript
// 1. Resolve unit_id
const unitId = await resolveUnitId(row.property_code, row.unit_name)

// 2. Find matching availability
const { data: availability } = await supabase
  .from('availabilities')
  .select('id')
  .eq('unit_id', unitId)
  .in('status', ['Applicant', 'Future'])
  .single()

// 3. Update leasing_agent
if (availability) {
  await supabase
    .from('availabilities')
    .update({ leasing_agent: row.leasing_agent })
    .eq('id', availability.id)
}
```

#### B. Application Data Saving
**Strategy**: Upsert by composite unique key

**Schema Design Decision**: Removed redundant columns
- ❌ Removed `status` - Can be derived from `screening_result`
- ❌ Removed `is_overdue` - Tracked via `unit_flags` system
- ✅ Added `screening_result` (nullable) - Actual Yardi data

**Unique Index**:
```sql
CREATE UNIQUE INDEX idx_applications_unique_key 
ON applications(property_code, unit_id, applicant_name, application_date);
```

**Upsert Logic**:
```typescript
const application = {
  property_code: row.property_code,
  unit_id: unitId,
  applicant_name: row.applicant,
  agent: row.leasing_agent,
  application_date: parseDate(row.application_date),
  screening_result: row.screening_result || null
}

await supabase
  .from('applications')
  .upsert([application], { 
    onConflict: 'property_code,unit_id,applicant_name,application_date' 
  })
```

#### C. Overdue Detection Logic
**Rule**: Application is overdue if:
- `application_date` is more than 7 days ago
- `screening_result` IS NULL

**Severity Escalation**:
- **Warning**: 8-14 days overdue
- **Error**: 14+ days overdue

```typescript
const daysSinceApplication = Math.floor(
  (today.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24)
)

const isOverdue = daysSinceApplication > 7 && !row.screening_result

if (isOverdue) {
  const flag = {
    unit_id: unitId,
    property_code: row.property_code,
    flag_type: 'application_overdue',
    severity: daysSinceApplication > 14 ? 'error' : 'warning',
    title: 'Application Screening Overdue',
    message: `Application for ${row.applicant} submitted ${daysSinceApplication} days ago without screening result`,
    metadata: {
      application_date: row.application_date,
      days_overdue: daysSinceApplication,
      applicant_name: row.applicant,
      unit_name: row.unit_name,
      agent: row.leasing_agent
    }
  }
  
  await supabase
    .from('unit_flags')
    .insert([flag], { ignoreDuplicates: true })
}
```

### Verification Results
✅ 4/4 applications saved successfully across 2 properties (SB, OB)
✅ NULL screening results correctly handled (pending applications)
✅ Unique constraint prevents duplicates on re-run
✅ Partial index optimizes overdue queries

### Troubleshooting: Issues Resolved

#### Issue 1: Parser Rejecting NULL Values
**Error**: Parser marked `screening_result` as required, rejecting pending applications  
**Impact**: 1 out of 4 applications was silently dropped (Felicia Dedman)  
**Fix**: Changed to `required: false` in parser config  
**Result**: All 4 applications now save correctly

#### Issue 2: Field Name Mismatches
**Error**: Parser used `applicant` and `leasing_agent`, but Solver expected `applicant_name` and `agent`  
**Impact**: NULL constraint violations, no applications saved  
**Fix**: Updated Solver code to use correct parser field names  
**Result**: Applications save successfully

#### Issue 3: Redundant Schema Columns
**Error**: `status` and `is_overdue` columns were redundant with `screening_result` and `unit_flags`  
**Impact**: Schema bloat, confusing data model  
**Fix**: Removed columns from database and code  
**Result**: Cleaner schema, status can be derived in queries

#### Issue 4: Invalid Column Reference
**Error**: Code referenced `is_active` column removed from `availabilities` table  
**Impact**: 406 Not Acceptable errors on availability queries  
**Fix**: Removed `.is('is_active', true)` filter  
**Result**: Queries work correctly (after browser cache clear)

#### Issue 5: Duplicate Flag Errors
**Error**: `ignoreDuplicates: true` didn't prevent 409 Conflict console errors  
**Impact**: Noisy console logs  
**Fix**: Added error code check to suppress duplicate errors (23505)  
**Result**: Clean console output

**Key Learning**: Nullable fields in source data should be marked as `required: false` in parser configs to avoid silently dropping records.

---

## 7. Future Phases
*   **Phase 3 (Inventory)**: Reconcile `Unit` status with `Tenancy` dates and `Availabilities`


