# Solver Tracking Integration Guide

This guide shows how to integrate the Solver tracking system into `useSolverEngine.ts`.

---

## Overview

The tracking system consists of:
1. **Database tables:** `solver_runs` and `solver_events`
2. **Tracking composable:** `useSolverTracking.ts` - tracks events during execution
3. **Report generator:** `useSolverReportGenerator.ts` - creates markdown reports

---

## Integration Steps

### 1. Import the composables

At the top of `useSolverEngine.ts`, add:

```typescript
import { useSolverTracking } from './useSolverTracking'
import { useSolverReportGenerator } from './useSolverReportGenerator'
```

### 2. Initialize in `processBatch()` function

```typescript
const processBatch = async (batchId: string) => {
    const tracker = useSolverTracking()
    const reportGen = useSolverReportGenerator()

    // Start tracking
    await tracker.startRun(batchId)

    statusMessage.value = `Starting Batch: ${batchId}`
    // ... existing code
```

### 3. Track Events Throughout Processing

#### A. Tenancies (Line ~240-265)

```typescript
// After inserting new tenancies
if (newTenancies.length > 0) {
    for (let i = 0; i < newTenancies.length; i += 1000) {
        const chunk = newTenancies.slice(i, i + 1000)
        const { error } = await supabase.from('tenancies').insert(chunk)
        if (error) throw error
        totalUpsertedTenancies += chunk.length

        // TRACK NEW TENANCIES
        chunk.forEach(t => {
            tracker.trackNewTenancy(pCode, {
                tenancy_id: t.id,
                resident_name: 'Primary Resident', // Get from first resident
                unit_name: 'Unit Name', // Get from unit lookup
                unit_id: t.unit_id,
                move_in_date: t.move_in_date,
                status: t.status,
                source: 'residents_status'
            })
        })
    }
}

// After updating existing tenancies
if (existingTenancies.length > 0) {
    // ... existing update code
    tracker.trackTenancyUpdates(pCode, existingTenancies.length)
}
```

#### B. Residents (Line ~315-340)

```typescript
// After inserting new residents
if (newResidents.length > 0) {
    for (let i = 0; i < newResidents.length; i += 1000) {
        const chunk = newResidents.slice(i, i + 1000)
        const { error } = await supabase.from('residents').insert(chunk)
        if (error) throw error

        // TRACK NEW RESIDENTS
        chunk.forEach(r => {
            tracker.trackNewResident(pCode, {
                tenancy_id: r.tenancy_id,
                resident_name: r.name,
                unit_name: 'Unit Name', // Lookup from tenancy
                unit_id: 'unit-id', // Lookup from tenancy
                role: r.role,
                email: r.email,
                phone: r.phone
            })
        })

        totalUpsertedResidents += chunk.length
    }
}

// After updating existing residents
if (existingResidents.length > 0) {
    // ... existing update code
    tracker.trackResidentUpdates(pCode, existingResidents.length)
}
```

#### C. Lease Renewals (Line ~465-495)

```typescript
// In renewal detection logic
if (isRenewal(...)) {
    // Deactivate old lease
    toDeactivate.push({...})

    // Track renewal
    tracker.trackLeaseRenewal(pCode, {
        tenancy_id: existingLease.tenancy_id,
        resident_name: 'Resident Name', // Fetch from residents table
        unit_name: 'Unit Name', // Fetch from units table
        unit_id: 'unit-id',
        old_lease: {
            start_date: existingLease.start_date,
            end_date: existingLease.end_date,
            rent_amount: existingLease.rent_amount
        },
        new_lease: {
            start_date: newLease.start_date,
            end_date: newLease.end_date,
            rent_amount: newLease.rent_amount
        }
    })

    toInsert.push(...)
}
```

```typescript
// After lease inserts/updates
tracker.trackLeaseChanges(pCode, toInsert.length, toUpdate.length)
```

#### D. Notices (Line ~790-860)

```typescript
// In notices processing loop
for (const row of rows) {
    // ... existing logic

    const tenancy = tenancyMap.get(unitId)
    if (tenancy && tenancy.status !== 'Notice') {
        // Auto-fix detected
        tracker.trackStatusAutoFix(pCode, row.unit_name, `${tenancy.status} → Notice`)
    }

    // Track notice
    tracker.trackNotice(pCode, {
        tenancy_id: tenancy.id,
        resident_name: row.resident_name || 'Unknown',
        unit_name: row.unit_name,
        unit_id: unitId,
        move_in_date: tenancy.move_in_date,
        move_out_date: parseDate(row.move_out_date),
        status_change: finalStatus !== tenancy.status ? `${tenancy.status} → ${finalStatus}` : undefined
    })
}
```

#### E. Availabilities (Line ~635-685)

```typescript
// After availability inserts/updates
tracker.trackAvailabilityChanges(pCode, toInsert.length, toUpdate.length)
```

#### F. Flags (Line ~975-995)

```typescript
// After creating makeready flags
if (overdueUnits.length > 0) {
    const { data: inserted } = await supabase.from('unit_flags').insert(...)
    const createdCount = inserted?.length || 0

    tracker.trackFlag(pCode, 'makeready_overdue', createdCount)
}

// After creating application flags (line ~1110)
if (!flagError) {
    tracker.trackFlag(pCode, 'application_overdue', 1)
}

// After creating transfer flags (line ~1266)
tracker.trackFlag(pCode, 'unit_transfer_active', chunk.length)
```

#### G. Applications (Line ~1090-1110)

```typescript
// After saving application
const { error: appError } = await supabase.from('applications').upsert(...)

if (!appError) {
    tracker.trackApplication(pCode, {
        applicant_name: row.applicant,
        unit_name: row.unit_name,
        unit_id: unitId,
        application_date: parseDate(row.application_date),
        screening_result: row.screening_result
    })

    totalApplicationsSaved++
}
```

### 4. Complete Run at End

At the end of `processBatch()`, before the final status message:

```typescript
// Complete tracking and generate report
const propertiesProcessed = reports.map(r => r.property_code)
const result = await tracker.completeRun(batchId, propertiesProcessed)

if (result) {
    // Generate markdown report
    const markdown = reportGen.generateMarkdown(
        batchId,
        new Date().toISOString(),
        result.summary,
        result.events
    )

    // Save to file system (if needed)
    const filename = reportGen.generateFilename(new Date().toISOString(), batchId)
    console.log('[Solver] Report generated:', filename)
    console.log(markdown)

    // Or send via email, save to S3, etc.
}

statusMessage.value = `Completed: ${totalUpsertedTenancies} Tenancies...`
```

### 5. Error Handling

Wrap the main try-catch to mark runs as failed:

```typescript
try {
    // ... all processing
} catch (e: any) {
    await tracker.failRun(e.message)
    statusMessage.value = `Error: ${e.message}`
    throw e
}
```

---

## Usage Example

After integration, each Solver run will:
1. Create a record in `solver_runs` table
2. Track all events in `solver_events` table
3. Generate a markdown summary (console logged or saved)

### Query runs from database:

```typescript
// Get recent runs
const { data: runs } = await supabase
    .from('solver_runs')
    .select('*')
    .order('upload_date', { ascending: false })
    .limit(10)

// Get events for a specific run
const { data: events } = await supabase
    .from('solver_events')
    .select('*')
    .eq('solver_run_id', runId)
    .order('event_date', { ascending: false })
```

---

## Next Steps

1. Run SQL migration: `supabase/migrations/20260202000002_create_solver_tracking.sql`
2. Integrate tracking calls as shown above
3. Test with a real batch
4. Review generated markdown report
5. Build UI to display run history and detailed events

---

## Future Enhancements

- Email reports to stakeholders
- Dashboard showing trends over time
- Alert on anomalies (e.g., unusually high renewals)
- Export reports to PDF
- Slack/Teams notifications
