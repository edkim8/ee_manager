# 🚨 CORE COMPONENT: TABLE ENGINE (LIVING STANDARD)

> **FOR ALL AI AGENTS:**
> This layer (`layers/table`) is the **SINGLE SOURCE OF TRUTH** for data tables.
> - **DO NOT** create custom tables in other layers. Use `GenericDataTable`.
> - **DO NOT** inline complex cell logic. Use/Create Cell Components in `layers/table/components/cells`.
> - **IF** you need a new feature (slot, prop), EXTEND this layer and update this guide.

---

# Table Engine - AI Usage Guide

> Technical reference for AI agents consuming the Table Engine layer.

## Quick Start

```vue
<script setup>
const data = ref([{ id: 1, name: 'John', status: 'active', amount: 5000 }])
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount', align: 'right' }
]
</script>

<template>
  <GenericDataTable :data="data" :columns="columns" row-key="id">
    <template #cell-status="{ value }">
      <BadgeCell :text="value" :color="value === 'active' ? 'success' : 'error'" />
    </template>
    <template #cell-amount="{ value }">
      <CurrencyCell :value="value" />
    </template>
  </GenericDataTable>
</template>
```

---

## Component: GenericDataTable

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Record<string, any>[]` | **required** | Array of row objects |
| `columns` | `TableColumn[]` | **required** | Column definitions |
| `rowKey` | `string` | `'id'` | Unique key field in data objects |
| `loading` | `boolean` | `false` | Show loading state |
| `enablePagination` | `boolean` | `false` | Enable built-in pagination |
| `pageSize` | `number` | `25` | Rows per page |
| `defaultSortField` | `string \| null` | `null` | Initial sort column |
| `defaultSortDirection` | `'asc' \| 'desc'` | `'asc'` | Initial sort direction |
| `clickable` | `boolean` | `false` | Enable row click events |
| `emptyMessage` | `string` | `'No data available'` | Empty state text |
| `striped` | `boolean` | `true` | Enable zebra striping on rows |
| `enableExport` | `boolean` | `false` | Show export button (CSV/PDF) |
| `exportFilename` | `string` | `'table-export'` | Filename prefix for exports |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row-click` | `(row, index)` | Row clicked (requires `clickable=true`) |
| `sort-change` | `{ field, direction }` | Sort state changed |
| `page-change` | `number` | Page number changed |

### Slots

#### `#toolbar`
Rendered above table. No scope. Use for search/filters.

```vue
<template #toolbar>
  <UInput v-model="search" placeholder="Search..." />
</template>
```

#### `#toolbar-actions`
Custom action buttons between toolbar and export button. No scope.

```vue
<template #toolbar-actions>
  <UButton icon="i-heroicons-plus" label="Add New" />
</template>
```

#### `#header-{key}`
Custom header for column `key`.

**Scope:** `{ column, isSorted, sortDirection }`

```vue
<template #header-name="{ column, isSorted }">
  <div class="flex items-center gap-1">
    <UIcon name="i-heroicons-user" />
    {{ column.label }}
  </div>
</template>
```

#### `#cell-{key}`
Custom cell renderer for column `key`. **Primary extension point.**

**Scope:** `{ row, column, value, rowIndex }`

```vue
<template #cell-status="{ value, row }">
  <BadgeCell :text="value" :color="row.isActive ? 'success' : 'error'" />
</template>
```

#### `#empty`
Custom empty state. No scope.

#### `#footer`
Custom footer/pagination.

**Scope:** `{ page, totalPages, showingText, goToPage, nextPage, prevPage }`

---

## Types

### TableColumn

```typescript
interface TableColumn {
  key: string           // Data object property key
  label: string         // Header display text
  sortable?: boolean    // Enable sorting (default: false)
  searchable?: boolean  // Show search icon in header (default: false)
  class?: string        // CSS classes for cells
  width?: string        // Column width (e.g., '150px', '20%')
  slotName?: string     // Override slot name (default: cell-{key})
  align?: 'left' | 'center' | 'right'
  headerClass?: string  // Header-specific classes
}
```

### SortState

```typescript
interface SortState {
  field: string | null
  direction: 'asc' | 'desc'
}
```

### PaginationState

```typescript
interface PaginationState {
  page: number   // Current page (1-indexed)
  limit: number  // Items per page
  total: number  // Total items
}
```

---

## Cell Components

All cells are in `layers/table/components/cells/`.

### LinkCell
```vue
<LinkCell value="View Details" to="/users/123" color="primary" />
```
| Prop | Type | Default |
|------|------|---------|
| `value` | `string \| number` | required |
| `to` | `string` | required |
| `color` | `'primary' \| 'blue' \| 'gray'` | `'primary'` |

### CurrencyCell
```vue
<CurrencyCell :value="5000" currency="USD" />
```
| Prop | Type | Default |
|------|------|---------|
| `value` | `number \| null` | `null` |
| `currency` | `string` | `'USD'` |
| `isError` | `boolean` | `false` |

### DateCell
```vue
<DateCell value="2024-01-15" format="short" />
```
| Prop | Type | Default |
|------|------|---------|
| `value` | `string \| Date \| null` | `null` |
| `format` | `'short' \| 'medium' \| 'long'` | `'short'` |

### BadgeCell
```vue
<BadgeCell text="Active" color="success" variant="subtle" />
```
| Prop | Type | Default |
|------|------|---------|
| `text` | `string` | required |
| `color` | `string` | `'neutral'` |
| `variant` | `'solid' \| 'outline' \| 'soft' \| 'subtle'` | `'subtle'` |

### OptionsCell
```vue
<OptionsCell :row="row" :get-items="getRowActions" />
```
| Prop | Type | Default |
|------|------|---------|
| `row` | `Record<string, any>` | required |
| `getItems` | `(row) => any[][]` | required |

### AlertCell
```vue
<AlertCell :alerts="['Missing data', 'Overdue']" show-success />
```
| Prop | Type | Default |
|------|------|---------|
| `alerts` | `string \| string[] \| null` | `null` |
| `showSuccess` | `boolean` | `true` |
| `iconSize` | `string` | `'text-base'` |

### CheckboxCell
```vue
<CheckboxCell :value="true" />
```
| Prop | Type | Default |
|------|------|---------|
| `value` | `boolean` | `false` |

### PercentCell
```vue
<PercentCell :value="0.156" :decimals="1" />
<!-- Outputs: 15.6% -->
```
| Prop | Type | Default |
|------|------|---------|
| `value` | `number` | `0` |
| `decimals` | `number` | `1` |

### TruncatedTextCell
```vue
<TruncatedTextCell value="Very long text..." :max-length="30" />
```
| Prop | Type | Default |
|------|------|---------|
| `value` | `string` | `''` |
| `maxLength` | `number` | `50` |

---

## Composables

### useTableSort

```typescript
const { sortState, sortedData, toggleSort, setSort } = useTableSort(
  computed(() => data.value),
  'name',  // default field
  'asc'    // default direction
)
```

### useTablePagination

```typescript
const {
  currentPage, totalPages, paginatedData,
  visiblePageRange, showingText,
  goToPage, firstPage, lastPage, nextPage, prevPage
} = useTablePagination(sortedData, 25)
```

### useTableSelection

```typescript
const {
  selectedRows, selectedCount, allSelected, someSelected,
  isSelected, toggleRow, selectAll, deselectAll, toggleSelectAll, clearSelection
} = useTableSelection(paginatedData, 'id')
```

### useTableExport

```typescript
const { exportToCSV, exportToPDF } = useTableExport()

// Export to CSV
exportToCSV(data, columns, 'my-export')

// Export to PDF (async, loads pdfMake from CDN)
await exportToPDF(data, columns, 'my-export')
```

### useTableColumns

```typescript
import { useTableColumns, type ColumnGroup } from '../composables/useTableColumns'

const columnGroups: Record<string, ColumnGroup> = {
  all: { label: 'All Columns', columns: ['name', 'email', 'status'] },
  minimal: { label: 'Minimal', columns: ['name', 'status'] }
}

const {
  visibleColumns,      // Filtered columns based on visibility
  currentGroup,        // Current active group name
  setColumnGroup,      // Switch to a preset group
  toggleColumn,        // Toggle single column visibility
  columnVisibilityItems // Dropdown menu items for UI
} = useTableColumns(allColumns, columnGroups, 'all')
```

---

## Common Patterns

### Status Badge with Color Mapping

```vue
<template #cell-status="{ value }">
  <BadgeCell
    :text="value"
    :color="statusColors[value] || 'neutral'"
  />
</template>

<script setup>
const statusColors = {
  active: 'success',
  pending: 'warning',
  inactive: 'error'
}
</script>
```

### Row Actions Dropdown

```vue
<template #cell-actions="{ row }">
  <OptionsCell :row="row" :get-items="getRowActions" />
</template>

<script setup>
const getRowActions = (row) => [[
  { label: 'Edit', icon: 'i-heroicons-pencil', click: () => edit(row) },
  { label: 'Delete', icon: 'i-heroicons-trash', click: () => remove(row) }
]]
</script>
```

### Clickable Rows with Navigation

```vue
<GenericDataTable
  :data="users"
  :columns="columns"
  clickable
  @row-click="(row) => navigateTo(`/users/${row.id}`)"
/>
```
