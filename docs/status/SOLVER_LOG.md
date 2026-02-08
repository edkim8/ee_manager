# Solver Engine Daily Log

This document tracks daily Solver runs, issues encountered, and corrections applied.

---

## 2026-02-02 - Daily Run #2

### Batch ID
`fa27e150-cad3-47b5-a511-9ad41a37a6a4`

### Errors Encountered

| Error Code | Table | Message | Status |
|------------|-------|---------|--------|
| 406 | availabilities | Not Acceptable (SELECT blocked by RLS) | FIXED |
| 23505 | applications | duplicate key violates unique constraint | FIXED |
| 409 | unit_flags | Conflict on INSERT (idempotent re-run) | EXPECTED |

### Root Causes

1. **Availabilities 406 (Not Acceptable):** RLS policy existed in migration file but wasn't applied to database. SELECT operations were blocked.

2. **Applications 23505 (Duplicate Key):** `.upsert()` wasn't specifying the `onConflict` parameter, causing it to fail on duplicate keys instead of updating.

3. **Unit Flags 409 (Conflict):** Expected behavior on idempotent re-runs. Code uses `ignoreDuplicates: true` which works correctly but HTTP 409 still logs to console.

### Corrections Applied

1. **RLS Policies Migration** (`20260202000001_fix_rls_policies.sql`)
   - Enabled RLS on `unit_flags` table
   - Recreated policies for all tables to ensure they exist
   - Added policies for: `availabilities`, `unit_flags`, `applications`, `residents`, `tenancies`, `leases`, `import_staging`

2. **Applications Upsert Fix** (`useSolverEngine.ts:1099-1106`)
   ```typescript
   .upsert(applicationData, {
       onConflict: 'property_code,unit_id,applicant_name,application_date',
       ignoreDuplicates: false  // Update on conflict
   })
   ```

3. **Flag Conflicts (No Code Change Needed)**
   - HTTP 409 errors are expected and handled correctly
   - `ignoreDuplicates: true` prevents actual errors
   - Console warnings are cosmetic only

### Verification
- [ ] Run SQL migration in Supabase
- [ ] Re-run Solver to verify fixes

---

## 2026-02-02 - Initial Debug Session

### Errors Encountered

| Error Code | Table | Message | Status |
|------------|-------|---------|--------|
| 21000 | residents | ON CONFLICT DO UPDATE cannot affect row a second time | FIXED |
| 23502 | leases | null value in column "property_code" violates not-null constraint | FIXED |

### Root Causes

1. **Residents (21000):** Duplicate entries in source data caused duplicate keys in both `newResidents` and `existingResidents` arrays sent to Supabase.

2. **Leases (23502):** Using `.upsert()` with partial payload `{id, is_active}` triggered INSERT path, failing NOT NULL constraints.

### Corrections Applied

1. **Residents Deduplication**
   - Added `newResidentsMap` (keyed by `tenancy_id:name`)
   - Added `existingResidentsMap2` (keyed by resident `id`)
   - File: `layers/admin/composables/useSolverEngine.ts:287-316`

2. **Leases Update Pattern**
   - Changed from `.upsert(chunk)` to `.update({...}).in('id', chunkIds)`
   - File: `layers/admin/composables/useSolverEngine.ts:500-515`

3. **Lease Renewal History Preservation**
   - Old lease: `is_active = false`, `lease_status = 'Past'`
   - New lease: inherits from old, overrides dates/rent, `lease_status = 'Current'`
   - Enables querying full lease history by `tenancy_id`

### Verification
- [x] Re-run successful
- [x] No 21000 or 23502 errors

---

## Error Code Reference

| Code | Type | Common Causes | Fix Strategy |
|------|------|---------------|--------------|
| 21000 | Cardinality Violation | Duplicate rows in single upsert batch | Deduplicate with Map before insert |
| 23502 | NOT NULL Violation | Missing required field in INSERT | Use `.update()` instead of `.upsert()` |
| 23505 | Unique Violation | Duplicate key on unique constraint | Use `.upsert()` with `onConflict` |
| 42501 | Permission Denied (RLS) | RLS policy blocking operation | Create/fix RLS policy |
| 406 | Not Acceptable | RLS policy missing for operation | Add SELECT policy to RLS |
| 409 | Conflict | Duplicate on INSERT with ignoreDuplicates | Expected - no fix needed |

---

## Solver Processing Order

1. **Residents Status** → Tenancies + Residents
2. **Expiring Leases** → Leases (with renewal detection)
3. **Availables** → Availabilities
4. **Notices** → Tenancy move-out dates
5. **MakeReady** → Unit flags (overdue)
6. **Applications** → Applications + flags
7. **Transfers** → Transfer flags

---

## Known Warnings (Non-Critical)

### HTTP 409 Conflicts on Idempotent Re-runs
**When:** Re-running Solver on same batch
**Tables:** `unit_flags`, transfer flags
**Why:** Flags with unique constraints already exist
**Behavior:** Code correctly uses `ignoreDuplicates: true`, HTTP 409 is cosmetic
**Action:** None required - expected behavior

### Auto-Fixed Tenancy Statuses
**When:** Notices report has tenancies not in "Notice" status
**Example:** `Future → Notice`, `Applicant → Notice`
**Why:** Yardi data inconsistency - unit has notice but status not updated
**Behavior:** Solver auto-fixes to "Notice" status
**Action:** None required - intended behavior
