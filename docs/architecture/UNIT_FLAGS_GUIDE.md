# Unit Flags System - Architecture & Usage Guide

**Date**: 2026-01-31  
**Purpose**: Flexible flag/alert system for tracking unit-level issues and metadata  
**Status**: ✅ Production Ready

---

## Executive Summary

The `unit_flags` table is a **flexible, extensible system** for tracking unit-level issues, alerts, and metadata across the application. It was designed to avoid schema changes every time a new type of flag is needed, using a **tag-based architecture** with rich metadata support.

**Key Benefits**:
- ✅ Add new flag types without schema migrations
- ✅ Rich metadata storage (JSONB)
- ✅ Historical tracking (created_at, resolved_at)
- ✅ Severity levels (info, warning, error)
- ✅ Automatic conflict resolution via partial unique index
- ✅ Clean separation from core data tables

---

## Table Schema

```sql
CREATE TABLE public.unit_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    property_code TEXT NOT NULL,
    flag_type TEXT NOT NULL,  -- Extensible: 'makeready_overdue', 'inspection_pending', etc.
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}',  -- Flexible storage for flag-specific data
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Partial unique index: prevents duplicate active flags per unit+type
CREATE UNIQUE INDEX idx_unit_flags_unique_active 
ON public.unit_flags(unit_id, flag_type) 
WHERE resolved_at IS NULL;
```

### Key Design Decisions

1. **`flag_type` (TEXT)**: Extensible string field allows infinite flag types without schema changes
2. **`severity` (ENUM)**: Categorizes urgency for UI rendering and filtering
3. **`metadata` (JSONB)**: Stores flag-specific data (days_overdue, inspector_name, etc.)
4. **Partial Unique Index**: Prevents duplicate **active** flags, but allows historical records
5. **Soft Delete Pattern**: `resolved_at` marks flags as resolved without deleting history

---

## Current Flag Types

### 1. `makeready_overdue`
**Purpose**: Alert when unit makeready is past due date  
**Severity**: `warning` (1-7 days), `error` (7+ days)  
**Metadata**:
```json
{
  "expected_date": "2026-01-16",
  "days_overdue": 15,
  "unit_name": "454-H"
}
```

**Created By**: Solver Engine (Step 2C: MakeReady)  
**Resolved When**: Unit removed from MakeReady report (work completed)

### 2. `application_overdue`
**Purpose**: Alert when application screening is overdue (>7 days without result)  
**Severity**: `warning` (8-14 days), `error` (14+ days)  
**Metadata**:
```json
{
  "application_date": "2026-01-15",
  "days_overdue": 16,
  "applicant_name": "John Doe",
  "unit_name": "C107",
  "agent": "Jane Smith"
}
```

**Created By**: Solver Engine (Step 2D: Applications)  
**Resolved When**: Screening result added to application

---

## Usage Patterns

### Creating Flags

```typescript
// Example: Creating a makeready_overdue flag
const flag = {
  unit_id: 'uuid-here',
  property_code: 'CV',
  flag_type: 'makeready_overdue',
  severity: daysOverdue > 7 ? 'error' : 'warning',
  title: 'MakeReady Overdue',
  message: `Unit C107 makeready was due on 2026-01-23`,
  metadata: {
    expected_date: '2026-01-23',
    days_overdue: 8,
    unit_name: 'C107'
  }
}

// Insert with ignoreDuplicates to handle partial unique index
const { data, error } = await supabase
  .from('unit_flags')
  .insert([flag], { ignoreDuplicates: true })
  .select('id')
```

**Important**: Use `{ ignoreDuplicates: true }` because the unique constraint is a **partial index** (only applies to active flags where `resolved_at IS NULL`).

### Querying Flags

```typescript
// Get all active flags for a unit
const { data: flags } = await supabase
  .from('unit_flags')
  .select('*')
  .eq('unit_id', unitId)
  .is('resolved_at', null)
  .order('severity', { ascending: false })  // Errors first

// Get all overdue makeready flags across properties
const { data: overdueFlags } = await supabase
  .from('unit_flags')
  .select(`
    *,
    units!inner(unit_name, property_code)
  `)
  .eq('flag_type', 'makeready_overdue')
  .is('resolved_at', null)
  .order('created_at', { ascending: true })
```

### Resolving Flags

```typescript
// Mark flag as resolved
const { error } = await supabase
  .from('unit_flags')
  .update({ 
    resolved_at: new Date().toISOString(),
    resolved_by: userId 
  })
  .eq('id', flagId)
```

---

## Future Flag Types (Recommendations)

### Inspection Flags
```typescript
{
  flag_type: 'inspection_pending',
  severity: 'info',
  title: 'Inspection Scheduled',
  metadata: {
    inspector: 'John Doe',
    scheduled_date: '2026-02-01',
    inspection_type: 'move-in'
  }
}

{
  flag_type: 'inspection_failed',
  severity: 'error',
  title: 'Inspection Failed',
  metadata: {
    failed_date: '2026-01-28',
    reason: 'Carpet stains',
    inspector: 'Jane Smith',
    photos: ['url1', 'url2']
  }
}
```

### Maintenance Flags
```typescript
{
  flag_type: 'maintenance_required',
  severity: 'warning',
  title: 'Maintenance Needed',
  metadata: {
    issue: 'HVAC repair',
    priority: 'high',
    work_order_id: 'WO-12345',
    reported_date: '2026-01-25'
  }
}
```

### Pricing Flags
```typescript
{
  flag_type: 'pricing_anomaly',
  severity: 'warning',
  title: 'Rent Below Market',
  metadata: {
    current_rent: 1200,
    market_rent: 1500,
    variance_percent: -20,
    last_updated: '2026-01-15'
  }
}
```

### Lease Flags
```typescript
{
  flag_type: 'lease_expiring_soon',
  severity: 'warning',
  title: 'Lease Expiring',
  metadata: {
    expiration_date: '2026-03-15',
    days_until_expiration: 45,
    renewal_status: 'pending'
  }
}
```

---

## Best Practices

### 1. Flag Lifecycle Management
- **Create**: When condition is detected (e.g., unit becomes overdue)
- **Update**: Use `ignoreDuplicates: true` to avoid errors on re-creation
- **Resolve**: Set `resolved_at` when condition no longer exists
- **Audit**: Keep resolved flags for historical analysis

### 2. Metadata Design
- Store **actionable data** (what, when, who, how much)
- Use consistent field names across flag types
- Include timestamps for time-sensitive data
- Store IDs for related records (work_order_id, inspection_id, etc.)

### 3. Severity Guidelines
- **`info`**: Informational, no action required (photos missing, inspection scheduled)
- **`warning`**: Requires attention soon (1-7 days overdue, rent below market)
- **`error`**: Urgent, requires immediate action (7+ days overdue, failed inspection)

---

## For AI Agents & Future Development

### When to Use unit_flags

✅ **Use unit_flags for**:
- Temporary conditions that can be resolved
- Issues that need tracking and alerting
- Metadata that doesn't belong in core tables
- Cross-cutting concerns (inspections, maintenance, etc.)

❌ **Don't use unit_flags for**:
- Core business data (use proper tables)
- Permanent attributes (add columns to units table)
- High-frequency updates (use caching layer)

### Adding New Flag Types

1. **No schema changes needed** - just start inserting with new `flag_type`
2. **Document the flag type** in this guide
3. **Define metadata structure** for consistency
4. **Set appropriate severity** based on urgency
5. **Implement resolution logic** to clean up flags

---

## Summary

The `unit_flags` system is a **core infrastructure component** that should be used across all modules dealing with units. It provides:

1. **Flexibility**: Add new flag types without schema changes
2. **Rich Context**: JSONB metadata for detailed information
3. **Historical Tracking**: Audit trail of when issues occurred and were resolved
4. **Clean Architecture**: Separates transient issues from core data
5. **Future-Proof**: Designed for extensibility and growth

**For Foreman**: This system should be **standard practice** for all unit-related alerts, issues, and temporary metadata. Encourage all AI agents and developers to use this pattern instead of adding boolean flags or status columns to core tables.
