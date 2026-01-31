# Parsing Engine (F-011) - AI Usage Guide

> **Status**: Core Layer (Stable)
> **Owner**: Antigravity
> **Version**: 1.0

## Overview
The Parsing Engine (`layers/parsing`) is a configuration-driven module for ingesting Excel/CSV files. It creates type-safe JSON output from messy input data.
**DO NOT write custom file readers.** Always use `useGenericParser` with a `ParserConfig`.

## Core Logic: `useGenericParser`

### Import
```typescript
import { useGenericParser } from '#imports' // Auto-imported from layer
import type { ParserConfig } from '~/layers/parsing/types'
```

### Configuration Strategies
You must select one of 3 strategies in your config:

#### 1. `standard`
For simple tables where Header Row = N and Data follows immediately.
- **Use Case**: Simple contacts list, chaotic but flat data.
- **Behavior**: Maps columns strictly by name.

#### 2. `yardi_report`
For complex Yardi reports where Property Codes are hidden in subheadings (e.g., `(PROP01)` in Column A).
- **Use Case**: Rent Roll, Delinquency Report.
- **Behavior**: Scans Column A for `(CODE)` patterns and injects `apt_code` into all subsequent rows until the next code is found.

#### 3. `fill_down`
For reports with sparse data where values are implied from the row above.
- **Use Case**: Residents Status (5p_residents_status).
- **Behavior**: If `apt_code` (or other `fillDownFields`) is empty, it copies the value from the previous valid row.

## Usage Example

```typescript
const config: ParserConfig = {
  id: 'resident_status_v1',
  namePattern: '5p_residents_status',
  strategy: 'fill_down',
  fillDownFields: ['apt_code'],
  mapping: {
    'Prop': { targetField: 'apt_code', required: true },
    'Resident': { targetField: 'name', transform: 'trim' },
    'Rent': { targetField: 'amount', transform: 'currency' }
  }
}

const result = await useGenericParser(file, config)
if (result.errors.length) {
  console.error(result.errors)
} else {
  console.log(result.data) // [{ apt_code: '...', name: '...', amount: 1000 }]
}
```

## Adding New Parsers
1.  **Do not write code first.**
2.  Go to `/playground/parser`.
3.  Upload the sample file.
4.  Use the UI to map headers and test the strategy.
5.  Copy the generated JSON Config into your application code.
