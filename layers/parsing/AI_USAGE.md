# Parsing Engine: AI Usage Guide

> **TARGET AUDIENCE**: AI Agents & Builders.
> **PURPOSE**: Quick references for implementing parsers. strictly code-focused.

## Standard Interface
All parsers follow this strict signature:

```typescript
type ParserFn<T> = (
  file: File, 
  options?: { 
    unitsLookup?: Array<{ apt_code: string; name: string; unit_id: string }> 
  }
) => Promise<ParsedResult<T>>

interface ParsedResult<T> {
  data: T[]
  errors: string[]
  meta: {
    filename: string
    totalRows: number
    parsedRows: number
  }
}
```

## Available Parsers

### 1. Properties
**File**: `layers/parsing/composables/parsers/useParseProperties.ts`
```typescript
import { useParseProperties, type PropertyRow } from '@/layers/parsing/composables/parsers/useParseProperties'

// Interface
interface PropertyRow {
  property_code: string | null // UNIQUE KEY
  name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
}

// Usage
const { data, errors } = await useParseProperties(file)
```

### 2. Units
**File**: `layers/parsing/composables/parsers/useParseUnits.ts`
```typescript
import { useParseUnits, type UnitRow } from '@/layers/parsing/composables/parsers/useParseUnits'

// Interface
interface UnitRow {
  property_code: string | null
  unit_code: string | null // UNIQUE KEY (scoped to property)
  status: string | null
  beds: string | null
  baths: string | null
  sqft: string | null
  market_rent: number | null
}

// Usage
const { data } = await useParseUnits(file)
```

### 3. Residents
**File**: `layers/parsing/composables/parsers/useParseResidents.ts`
```typescript
import { useParseResidents, type ResidentRow } from '@/layers/parsing/composables/parsers/useParseResidents'

// Interface
interface ResidentRow {
  property_code: string | null
  unit_code: string | null
  resident_name: string | null
  status: string | null
  lease_start: string | null // ISO Date YYYY-MM-DD
  lease_end: string | null   // ISO Date YYYY-MM-DD
  rent: number | null
  balance: number | null
}

// Usage
// Note: requires unitsLookup if you want to resolve unit_id automatically
const { data } = await useParseResidents(file, { unitsLookup })
```

### 4. Generic Yardi Report
**File**: `layers/parsing/composables/parsers/useParseYardiReport.ts`
```typescript
import { useParseYardiReport, type YardiReportRow } from '@/layers/parsing/composables/parsers/useParseYardiReport'

// Interface
interface YardiReportRow {
  property_code: string | null
  unit_code: string | null
  tenant_code: string | null
  name: string | null
  [key: string]: any
}

// Usage
const { data } = await useParseYardiReport(file)
```

## Common Transforms
When creating new parsers in **Parser Playground**, use these transform keys:

| Transform | Description | Output Type |
|-----------|-------------|-------------|
| `date`    | Parses `12/31/2023` -> `2023-12-31` | `string` (ISO) |
| `currency`| Parses `$1,200.00` -> `1200.00` | `number` |
| `phone`   | Extracts digits `(555) 123-4567` -> `5551234567` | `string` |
| `trim`    | Trims whitespace | `string` |
| `yardi_code`| Maps `azres422` -> `RS` (via dictionary) | `string` |

## Boilerplate Generator
To create a new parser, use the **Scaffold Template**:

```typescript
import { useGenericParser } from '../useGenericParser'
import type { ParserConfig, ParsedResult } from '../../types'

export interface MyNewReportRow {
  field_a: string | null
  field_b: number | null
}

const config: ParserConfig = {
  id: 'my_new_report',
  namePattern: '.*',
  headerRow: 1,
  strategy: 'standard', // or 'yardi_report' or 'fill_down'
  mapping: {
    'Header A': { targetField: 'field_a' },
    'Header B': { targetField: 'field_b', transform: 'currency' }
  }
}

export async function useParseMyNewReport(file: File): Promise<ParsedResult<MyNewReportRow>> {
  return useGenericParser<MyNewReportRow>(file, config)
}

export const myNewReportConfig = config
```

### 5. Applications (5p_Applications)
**File**: `layers/parsing/composables/parsers/useParseApplications.ts`
```typescript
import { useParseApplications, type ApplicationsRow } from '@/layers/parsing/composables/parsers/useParseApplications'

// Interface
interface ApplicationsRow {
  leasing_agent: string | null
  applicant: string | null
  application_date: string | null
  property_code: string | null
  unit_name: string | null
  screening_result: string | null
  screening_last_updated: string | null
}
```

### 6. Work Orders (5p_WorkOrders)
**File**: `layers/parsing/composables/parsers/useParseWorkorders.ts`
```typescript
import { useParseWorkorders, type WorkordersRow } from '@/layers/parsing/composables/parsers/useParseWorkorders'

// Interface
interface WorkordersRow {
  yardi_work_order_id: string | null
  description: string | null
  call_date: string | null
  property_code: string | null
  unit_name: string | null
  resident: string | null
  phone: string | null
  category: string | null
  status: string | null
}

// Database Sync
// File: layers/parsing/composables/useWorkOrdersSync.ts
// Strategy: Upsert (Active) & Soft Delete (Missing)
// import { useWorkOrdersSync } from '@/layers/parsing/composables/useWorkOrdersSync'
// const { syncWorkOrders, isSyncing, syncStats } = useWorkOrdersSync()
// await syncWorkOrders(parsedData)
```

### 7. Alerts (5p_Alerts)
**File**: `layers/parsing/composables/parsers/useParseAlerts.ts`
```typescript
import { useParseAlerts, type AlertsRow } from '@/layers/parsing/composables/parsers/useParseAlerts'

// Interface
interface AlertsRow {
  property_code: string | null
  unit_name: string | null
  description: string | null
  resident: string | null
}

// Database Sync
// File: layers/parsing/composables/useAlertsSync.ts
// import { useAlertsSync } from '@/layers/parsing/composables/useAlertsSync'
// const { syncAlerts, isSyncing, syncStats } = useAlertsSync()
// await syncAlerts(parsedData)
```

### 8. Make Ready (5p_MakeReady)
**File**: `layers/parsing/composables/parsers/useParseMakeready.ts`
```typescript
import { useParseMakeready, type MakereadyRow } from '@/layers/parsing/composables/parsers/useParseMakeready'

// Interface
interface MakereadyRow {
  property_code: string | null
  bedrooms: string | null
  rent: string | null
  sqft: string | null
  make_ready_date: string | null
  unit_name: string | null
  status: string | null
}
```

### 9. Notices (5p_Notices)
**File**: `layers/parsing/composables/parsers/useParseNotices.ts`
```typescript
import { useParseNotices, type NoticesRow } from '@/layers/parsing/composables/parsers/useParseNotices'

// Interface
interface NoticesRow {
  move_out_date: string | null
  property_code: string | null
  unit_name: string | null
  resident: string | null
  status: string | null
}
```

### 10. Availables (5p_Availables)
**File**: `layers/parsing/composables/parsers/useParseAvailables.ts`
```typescript
import { useParseAvailables, type AvailablesRow } from '@/layers/parsing/composables/parsers/useParseAvailables'

// Interface
interface AvailablesRow {
  property_code: string | null
  unit_name: string | null
  floor_plan: string | null
  bedroom_count: string | null
  offered_rent: string | null
  available_date: string | null
  days_vacant: string | null
  sqft: string | null
  status: string | null
  amenities: string | null
}
```

### 11. Delinquencies (5p_Delinquencies)
**File**: `layers/parsing/composables/parsers/useParseDelinquencies.ts`
```typescript
import { useParseDelinquencies, type DelinquenciesRow } from '@/layers/parsing/composables/parsers/useParseDelinquencies'

// Interface
interface DelinquenciesRow {
  property_code: string | null
  unit_name: string | null
  tenancy_id: string | null
  resident: string | null
  total_unpaid: number | null
  days_0_30: number | null
  days_31_60: number | null
  days_61_90: number | null
  days_90_plus: number | null
  prepays: number | null
  balance: number | null
}
```

### 12. Residents Status (5p_residents_status)
**File**: `layers/parsing/composables/parsers/useParseResidentsStatus.ts`
```typescript
import { useParseResidentsStatus, type ResidentsStatusRow } from '@/layers/parsing/composables/parsers/useParseResidentsStatus'

// Interface
interface ResidentsStatusRow {
  property_code: string | null
  unit_name: string | null
  tenancy_id: string | null
  type: string | null
  resident: string | null
  rent: string | null
  deposit: string | null
  status: string | null
  lease_start_date: string | null
  lease_end_date: string | null
  move_in_date: string | null
  move_out_date: string | null
  phone: string | null
  email: string | null
}
```

### 13. Transfers (5p_Transfers)
**File**: `layers/parsing/composables/parsers/useParseTransfers.ts`
```typescript
import { useParseTransfers, type TransfersRow } from '@/layers/parsing/composables/parsers/useParseTransfers'

// Interface
interface TransfersRow {
  from_property_code: string | null
  from_status: string | null
  from_unit_name: string | null
  resident: string | null
  to_unit_name: string | null
  to_property_code: string | null
  to_status: string | null
}
```

### 14. Expiring Leases (5p_ExpiringLeases)
**File**: `layers/parsing/composables/parsers/useParseExpiringLeases.ts`
```typescript
import { useParseExpiringleases, type ExpiringleasesRow } from '@/layers/parsing/composables/parsers/useParseExpiringLeases'

// Interface
interface ExpiringleasesRow {
  unit_name: string | null
  floor_plan: string | null
  status: string | null
  market_rent: number | null
  sqft: string | null
  deposit: string | null
  tenancy_code: string | null
  resident: string | null
  lease_rent: number | null
  lease_start_date: string | null
  lease_end_date: string | null
  move_out_date: string | null
  phone: string | null
  property_code: string | null
}
```
