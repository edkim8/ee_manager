# Solver Tracking System Architecture

**Created:** 2026-02-02
**Purpose:** Quick reference for understanding the Solver tracking system

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YARDI DAILY REPORTS                      │
│  (Residents, Leases, Availables, Notices, Applications,    │
│   MakeReady, Transfers)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              useSolverEngine.ts (Main Engine)               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. Initialize Tracking (startRun)                  │   │
│  │     ↓                                               │   │
│  │  2. Process Each Report Type                        │   │
│  │     • Tenancies/Residents (dedup + insert/update)   │   │
│  │     • Leases (renewal detection + history)          │   │
│  │     • Availabilities (status sync)                  │   │
│  │     • Notices (move-out + auto-fix)                 │   │
│  │     • Applications (screening tracking)             │   │
│  │     • Flags (makeready, application, transfer)      │   │
│  │     ↓                                               │   │
│  │  3. Track Events (useSolverTracking)                │   │
│  │     ↓                                               │   │
│  │  4. Complete Run (completeRun)                      │   │
│  │     ↓                                               │   │
│  │  5. Generate Report (useSolverReportGenerator)      │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
             ▼                          ▼
┌────────────────────────┐   ┌──────────────────────────────┐
│   Database Storage     │   │   Markdown Report Output     │
│                        │   │                              │
│  solver_runs           │   │  Console Output:             │
│  • batch_id            │   │  • Run summary               │
│  • status              │   │  • Per-property details      │
│  • upload_date         │   │  • New tenancies/residents   │
│  • properties[]        │   │  • Lease renewals            │
│  • summary (JSONB)     │   │  • Notices given             │
│                        │   │  • Applications saved        │
│  solver_events         │   │  • Flags created             │
│  • solver_run_id (FK)  │   │  • Status auto-fixes         │
│  • event_type          │   │                              │
│  • property_code       │   │  Filename:                   │
│  • unit_id (FK)        │   │  YYYY-MM-DD_HHMM_batchId.md  │
│  • tenancy_id (FK)     │   │                              │
│  • details (JSONB)     │   │                              │
└────────────────────────┘   └──────────────────────────────┘
```

---

## Data Flow

### 1. Initialization Phase

```typescript
const tracker = useSolverTracking()
const reportGen = useSolverReportGenerator()

await tracker.startRun(batchId)
// Creates record in solver_runs with status='running'
```

### 2. Processing Phase

Each Solver operation tracks events in memory:

```typescript
// Example: New tenancy detected
tracker.trackNewTenancy(pCode, {
    tenancy_id: '...',
    resident_name: 'John Doe',
    unit_name: '101',
    status: 'Current',
    // ... more details
})

// Event stored in memory array:
events.push({
    property_code: 'SB',
    event_type: 'new_tenancy',
    unit_id: 'uuid...',
    tenancy_id: 'uuid...',
    details: { resident_name: 'John Doe', ... }
})

// Counter incremented:
propertySummaries['SB'].tenanciesNew++
```

### 3. Completion Phase

```typescript
const result = await tracker.completeRun(batchId, ['CV', 'OB', 'RS', 'SB', 'WO'])

// Saves to database:
// 1. Batch insert solver_events (1000 per chunk)
// 2. Update solver_run with status='completed', summary JSONB

// Generate report:
const markdown = reportGen.generateMarkdown(
    batchId,
    uploadDate,
    result.summary,    // Property summaries (counts)
    result.events      // Detailed event list
)
```

---

## Event Type Reference

| Event Type | When Tracked | Data Captured | Use Case |
|------------|-------------|---------------|----------|
| `new_tenancy` | New tenancy inserted | resident_name, unit, status, move_in_date | Track new leases/applicants |
| `new_resident` | New resident inserted | name, role, email, phone | Track household changes |
| `lease_renewal` | Old lease marked Past, new created | old_lease, new_lease, rent change | Track renewals & pricing |
| `notice_given` | Tenant gives move-out notice | resident, unit, move_out_date | Track turnover |
| `application_saved` | Application record created | applicant, date, screening | Track leasing pipeline |
| `price_change` | Availability rent_offered changes | unit, old_rent, new_rent, change_amount, change_percent | Track pricing strategy (Added 2026-02-06) |

**Aggregate Counters (no detailed events):**
- Tenancy/Resident updates
- Lease inserts/updates
- Availability changes
- Flag counts

---

## Database Schema Details

### solver_runs

```sql
CREATE TABLE solver_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id text NOT NULL,
    upload_date timestamptz DEFAULT now(),
    completed_at timestamptz,
    status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    properties_processed text[],           -- ['CV', 'OB', 'RS', 'SB', 'WO']
    summary jsonb,                         -- Per-property counts
    error_message text,
    created_by uuid REFERENCES auth.users(id),

    INDEX idx_solver_runs_batch_id (batch_id),
    INDEX idx_solver_runs_status (status),
    INDEX idx_solver_runs_upload_date (upload_date)
);
```

**Summary JSONB Structure:**
```json
{
    "SB": {
        "tenanciesNew": 5,
        "tenanciesUpdated": 120,
        "residentsNew": 8,
        "residentsUpdated": 150,
        "leasesNew": 3,
        "leasesUpdated": 15,
        "leasesRenewed": 12,
        "availabilitiesNew": 10,
        "availabilitiesUpdated": 25,
        "noticesProcessed": 4,
        "statusAutoFixes": ["Unit 1025: Future → Notice"],
        "makereadyFlags": 2,
        "applicationFlags": 1,
        "transferFlags": 0,
        "priceChanges": 3,
        "applicationsSaved": 3
    }
}
```

### solver_events

```sql
CREATE TABLE solver_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    solver_run_id uuid REFERENCES solver_runs(id) ON DELETE CASCADE,
    event_date timestamptz DEFAULT now(),
    property_code text NOT NULL,
    event_type text NOT NULL,
    unit_id uuid REFERENCES units(id),
    tenancy_id uuid REFERENCES tenancies(id),
    details jsonb NOT NULL,                -- Event-specific data

    INDEX idx_solver_events_run_id (solver_run_id),
    INDEX idx_solver_events_type (event_type),
    INDEX idx_solver_events_property (property_code),
    INDEX idx_solver_events_date (event_date)
);
```

**Details JSONB Examples:**

**new_tenancy:**
```json
{
    "tenancy_id": "uuid...",
    "resident_name": "John Doe",
    "unit_name": "1025",
    "unit_id": "uuid...",
    "move_in_date": "2025-03-01",
    "status": "Current",
    "source": "residents_status"
}
```

**lease_renewal:**
```json
{
    "tenancy_id": "uuid...",
    "resident_name": "Jane Smith",
    "unit_name": "2135",
    "unit_id": "uuid...",
    "old_lease": {
        "start_date": "2024-05-01",
        "end_date": "2025-05-01",
        "rent_amount": 1200
    },
    "new_lease": {
        "start_date": "2025-05-01",
        "end_date": "2026-05-01",
        "rent_amount": 1250
    }
}
```

---

## Composable APIs

### useSolverTracking()

**Methods:**

```typescript
// Initialize run
startRun(batchId: string): Promise<string | null>

// Track specific events
trackNewTenancy(propertyCode, details)
trackNewResident(propertyCode, details)
trackLeaseRenewal(propertyCode, details)
trackNotice(propertyCode, details)
trackApplication(propertyCode, details)

// Track counts
trackTenancyUpdates(propertyCode, count)
trackResidentUpdates(propertyCode, count)
trackLeaseChanges(propertyCode, newCount, updateCount)
trackAvailabilityChanges(propertyCode, newCount, updateCount)
trackFlag(propertyCode, flagType, count)
trackStatusAutoFix(propertyCode, unitName, statusChange)

// Complete/fail run
completeRun(batchId, propertiesProcessed): Promise<{runId, summary, events} | null>
failRun(errorMessage: string): Promise<void>

// Get current state
getCurrentSummary(): {summary, events}
```

### useSolverReportGenerator()

**Methods:**

```typescript
// Generate markdown from data
generateMarkdown(
    batchId: string,
    uploadDate: string,
    propertySummaries: Record<string, PropertySummary>,
    events: SolverEvent[]
): string

// Generate filename
generateFilename(uploadDate: string, batchId: string): string
// Returns: "2026-02-02_1430_693853d4.md"
```

---

## Query Examples

### Get Recent Runs

```sql
SELECT
    id,
    batch_id,
    status,
    upload_date,
    completed_at,
    properties_processed,
    (summary->>'SB')::jsonb->>'leasesRenewed' as sb_renewals
FROM solver_runs
ORDER BY upload_date DESC
LIMIT 10;
```

### Get Events for Specific Run

```sql
SELECT
    event_type,
    property_code,
    details->>'resident_name' as resident,
    details->>'unit_name' as unit,
    event_date
FROM solver_events
WHERE solver_run_id = 'uuid...'
    AND event_type IN ('new_tenancy', 'lease_renewal', 'notice_given')
ORDER BY event_date;
```

### Get All Lease Renewals (Last 30 Days)

```sql
SELECT
    sr.upload_date,
    sr.batch_id,
    se.property_code,
    se.details->>'resident_name' as resident,
    se.details->>'unit_name' as unit,
    (se.details->'old_lease'->>'rent_amount')::numeric as old_rent,
    (se.details->'new_lease'->>'rent_amount')::numeric as new_rent
FROM solver_events se
JOIN solver_runs sr ON se.solver_run_id = sr.id
WHERE se.event_type = 'lease_renewal'
    AND sr.upload_date >= now() - interval '30 days'
ORDER BY sr.upload_date DESC;
```

### Get Property Summary Stats

```sql
SELECT
    property_code,
    COUNT(*) FILTER (WHERE event_type = 'new_tenancy') as new_tenancies,
    COUNT(*) FILTER (WHERE event_type = 'lease_renewal') as renewals,
    COUNT(*) FILTER (WHERE event_type = 'notice_given') as notices
FROM solver_events
WHERE solver_run_id = 'uuid...'
GROUP BY property_code;
```

---

## Performance Considerations

### Batch Processing

Events are saved in chunks of 1000 to avoid query size limits:

```typescript
for (let i = 0; i < events.length; i += 1000) {
    const chunk = events.slice(i, i + 1000)
    const eventsWithRunId = chunk.map(e => ({
        solver_run_id: currentRunId,
        ...e
    }))
    await supabase.from('solver_events').insert(eventsWithRunId)
}
```

### Memory Usage

Events are stored in memory during processing:
- Average run: ~500-1000 events
- Memory footprint: ~1-2MB
- Cleared after `completeRun()`

### Database Impact

- `solver_runs`: 1 row per daily run (365/year)
- `solver_events`: ~500-1000 rows per daily run (~365K/year)
- JSONB indexing: Use GIN indexes for complex queries
- Partitioning: Consider partitioning by `upload_date` after 1 year

---

## Error Handling

### Run Failure

If any error occurs during processing:

```typescript
catch (e: any) {
    await tracker.failRun(e.message)
    // Updates solver_run:
    // - status = 'failed'
    // - error_message = e.message
    // - completed_at = now()
    throw e
}
```

### Event Save Failure

If event save fails, error is logged but doesn't stop execution:

```typescript
const { error } = await supabase.from('solver_events').insert(eventsWithRunId)
if (error) {
    console.error('[SolverTracking] Failed to save events chunk:', error)
    // Continue processing - tracking is non-critical
}
```

---

## Future Enhancements

### Planned Features

1. **Email Reports**
   - Daily summary emailed to stakeholders
   - Alerts on anomalies (high renewals, many notices)

2. **Dashboard UI**
   - Trends over time (renewals, turnover)
   - Drill-down to event details
   - Comparison between properties

3. **Analytics**
   - Renewal rate by property
   - Average rent increase on renewals
   - Turnover prediction based on notice patterns
   - Application conversion rates

4. **Export Options**
   - PDF reports
   - CSV export for Excel analysis
   - API endpoints for external tools

5. **Notifications**
   - Slack/Teams integration
   - SMS alerts for critical issues
   - Webhook support

---

## Troubleshooting

### No Events Saved

**Symptom:** `solver_runs` record exists but no `solver_events`

**Causes:**
1. No events tracked (empty reports)
2. Database permission issues
3. Event save silently failed

**Debug:**
```typescript
const state = tracker.getCurrentSummary()
console.log('Events in memory:', state.events.length)
```

### Report Not Generated

**Symptom:** No markdown output in console

**Causes:**
1. `completeRun()` returned null
2. Database save failed
3. Error in report generation

**Debug:**
```typescript
const result = await tracker.completeRun(...)
console.log('Complete result:', result ? 'Success' : 'Failed')
```

### Duplicate Events

**Symptom:** Same event appears multiple times

**Causes:**
1. Solver re-run on same batch_id
2. Tracking called multiple times in loop

**Fix:**
- Solver runs are idempotent, but events are additive
- Each run creates new `solver_run` and `solver_events`
- Filter by latest run when querying

---

**Last Updated:** 2026-02-02
**Maintained By:** Claude Sonnet 4.5
