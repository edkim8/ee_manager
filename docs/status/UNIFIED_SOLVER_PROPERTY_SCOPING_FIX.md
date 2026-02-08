# Unified Solver: Property Scoping Bug Fix

**Date:** 2026-02-06
**Status:** ✅ FIXED
**Files Modified:** 3

---

## 🚨 The Problems

### Problem 1: Property Scoping Bug
The Unified Solver processes operational reports (Alerts, Work Orders, Delinquencies) sequentially per-property in a loop. However, the sync functions were fetching data **globally** and accidentally deactivating records from other properties.

### Problem 2: Missing Enum Values
The `import_report_type` enum was missing three operational report types: `alerts`, `work_orders`, and `delinquencies`. This caused SQL errors when the Unified Solver tried to query for these report types.

### Bug Flow Example:
1. Solver processes **Property A** alerts (100 rows)
2. `syncAlerts()` fetches **ALL** alerts in the database (Properties A, B, C)
3. It identifies alerts NOT in the incoming 100 rows
4. **Result:** Alerts for Property B and C are marked `is_active = false`
5. Next iteration processes Property B → Property A's alerts get deactivated
6. **Final Result:** Only the last property processed has active alerts

---

## 🔍 Root Cause

### useAlertsSync.ts (Lines 23-25)
```typescript
// ❌ BEFORE: Fetched ALL alerts globally
const { data: existingData, error: fetchError } = await client
  .from('alerts')
  .select('*')
```

### useWorkOrdersSync.ts (Lines 23-26)
```typescript
// ❌ BEFORE: Fetched ALL work orders globally
const { data: existingData, error: fetchError } = await client
  .from('work_orders')
  .select('id, property_code, yardi_work_order_id')
  .eq('is_active', true)
```

### Delinquency Check
✅ `useDelinquenciesSync.ts` already had property scoping (lines 69-75) - no changes needed!

---

## ✅ The Fix

### 1. useAlertsSync.ts
**Changes:**
- Extract `propertyCodes` from incoming `parsedRows`
- Filter fetch query to ONLY get alerts for those properties
- Deactivation logic now only affects alerts within property scope

```typescript
// ✅ AFTER: Property-scoped fetch
// 1. Extract property codes from incoming data (for property-scoped sync)
const propertyCodes = [...new Set(parsedRows.map(r => r.property_code))].filter(Boolean)

// 2. Fetch ONLY alerts for the properties in this batch
const query = client.from('alerts').select('*')

if (propertyCodes.length > 0) {
  query.in('property_code', propertyCodes)
}

const { data: existingData, error: fetchError } = await query
```

**Lines Modified:** 22-34

---

### 2. useWorkOrdersSync.ts
**Changes:**
- Extract `propertyCodes` from incoming `parsedRows`
- Filter fetch query to ONLY get work orders for those properties
- Deactivation logic now only affects work orders within property scope

```typescript
// ✅ AFTER: Property-scoped fetch
// 1. Extract property codes from incoming data (for property-scoped sync)
const propertyCodes = [...new Set(parsedRows.map(r => r.property_code))].filter(Boolean)

// 2. Fetch ONLY work orders for the properties in this batch
const query = client
  .from('work_orders')
  .select('id, property_code, yardi_work_order_id')
  .eq('is_active', true)

if (propertyCodes.length > 0) {
  query.in('property_code', propertyCodes)
}

const { data: existingData, error: fetchError } = await query
```

**Lines Modified:** 22-37

---

### 3. useDelinquenciesSync.ts
**Changes:**
- Updated comment to clarify property-scoping behavior (line 69)
- **No logic changes** - already implemented correctly!

---

## 🎯 How It Works Now

### Sequential Processing (useSolverEngine.ts Phase 3)
```
For Property A:
  → Fetch ONLY Property A's alerts/work orders/delinquencies
  → Compare incoming data vs existing data
  → Deactivate ONLY Property A's missing records
  → Insert/Update Property A's records

For Property B:
  → Fetch ONLY Property B's alerts/work orders/delinquencies
  → Compare incoming data vs existing data
  → Deactivate ONLY Property B's missing records
  → Insert/Update Property B's records
```

**Key Improvement:** Each property's data is processed in isolation. Property B's records are never affected by Property A's sync.

---

## 📊 Schema Validation

### Alerts Table (NOT NULL constraints)
✅ **Required Fields:**
- `property_code: string`
- `unit_name: string`
- `description: string`

All fields are present in `AlertsRow` parser output.

### Work Orders Table (NOT NULL constraints)
✅ **Required Fields:**
- `property_code: string`
- `yardi_work_order_id: string`
- `status: string`

All fields are present in `WorkordersRow` parser output.

**Note:** `unit_id` is resolved via `resolveUnitId()` but is nullable, so no FK constraint violations.

---

## 🧪 Testing Recommendations

1. **Test Multi-Property Upload:**
   - Upload reports for Properties A and B
   - Verify Property A's alerts remain active after Property B is processed
   - Check deactivation logs to ensure only property-specific records are affected

2. **Test Missing Properties:**
   - Upload reports for Property A only
   - Verify Property B's existing records are NOT deactivated

3. **Monitor Error Logs:**
   - Watch for Code 23502 (NOT NULL violations)
   - Watch for FK constraint errors on `unit_id` or `tenancy_id`

---

## 🔧 Fix 2: Add Missing Enum Values

### Database Migration
Created migration: `supabase/migrations/20260206000003_add_ops_report_types.sql`

```sql
ALTER TYPE public.import_report_type ADD VALUE IF NOT EXISTS 'alerts';
ALTER TYPE public.import_report_type ADD VALUE IF NOT EXISTS 'work_orders';
ALTER TYPE public.import_report_type ADD VALUE IF NOT EXISTS 'delinquencies';
```

**Applied to:** Online Supabase database via SQL Editor

### TypeScript Types Update
Updated `types/supabase.ts` line 815:

```typescript
// ✅ AFTER: All 11 report types supported
import_report_type: "residents_status" | "leased_units" | "expiring_leases" |
                    "availables" | "applications" | "make_ready" | "notices" |
                    "transfers" | "alerts" | "work_orders" | "delinquencies"
```

---

## 📝 Files Modified

1. `/layers/parsing/composables/useAlertsSync.ts`
   - Lines 22-34: Added property-scoped fetch
   - Updated comment numbering (3-7)

2. `/layers/parsing/composables/useWorkOrdersSync.ts`
   - Lines 22-37: Added property-scoped fetch
   - Updated comment numbering (3-7)

3. `/layers/parsing/composables/useDelinquenciesSync.ts`
   - Line 69: Updated comment for clarity
   - No logic changes

4. `/types/supabase.ts`
   - Line 815: Added 'alerts', 'work_orders', 'delinquencies' to enum type

5. `/supabase/migrations/20260206000003_add_ops_report_types.sql`
   - New migration to add enum values to database

---

## ✅ Verification Checklist

**Property Scoping:**
- [x] Property codes extracted from incoming data
- [x] Fetch queries scoped to specific properties
- [x] Deactivation logic only affects records within scope
- [x] Comment numbering updated consistently
- [x] No breaking changes to function signatures
- [x] Delinquencies already had correct scoping

**Enum Fix:**
- [x] Migration created for enum values
- [x] Enum values added to database (alerts, work_orders, delinquencies)
- [x] TypeScript types updated to match database
- [x] All 11 report types now supported

---

## 🔮 Future Improvements

1. **Performance Optimization:**
   - Consider batching multi-property fetches if reports often contain multiple properties
   - Current implementation: 1 fetch per property (safe but potentially slower)

2. **Error Handling:**
   - Add validation for missing `property_code` in parsed rows
   - Log warnings if property codes are missing/invalid

3. **Testing:**
   - Add integration tests for multi-property scenarios
   - Mock scenarios where Property A is processed, then Property B

---

**Fixed By:** Claude Code
**Review Status:** Ready for Testing
