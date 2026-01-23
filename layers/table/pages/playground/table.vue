<script setup lang="ts">
/**
 * Table Engine Playground - Kitchen Sink Demo
 * ============================================
 * Demonstrates all table features: sorting, pagination, custom cells,
 * column grouping, export, and more.
 */
import type { TableColumn } from '../../types'
import { useTableColumns, type ColumnGroup } from '../../composables/useTableColumns'

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------
interface User {
  id: number
  name: string
  email: string
  status: 'active' | 'pending' | 'inactive'
  role: string
  department: string
  salary: number
  hireDate: string
  performance: number
  isVerified: boolean
  notes: string
  alerts: string[] | null
}

const mockUsers: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', status: 'active', role: 'Engineer', department: 'Engineering', salary: 95000, hireDate: '2022-03-15', performance: 0.92, isVerified: true, notes: 'Top performer in Q4 with exceptional delivery metrics', alerts: null },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', status: 'active', role: 'Designer', department: 'Design', salary: 85000, hireDate: '2021-07-22', performance: 0.88, isVerified: true, notes: 'UI specialist', alerts: null },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', status: 'pending', role: 'Manager', department: 'Operations', salary: 120000, hireDate: '2020-01-10', performance: 0.95, isVerified: false, notes: 'Pending background check completion', alerts: ['Missing documentation'] },
  { id: 4, name: 'David Wilson', email: 'david@example.com', status: 'inactive', role: 'Analyst', department: 'Finance', salary: 75000, hireDate: '2023-06-01', performance: 0.72, isVerified: true, notes: 'On leave', alerts: ['Performance review overdue', 'Training incomplete'] },
  { id: 5, name: 'Eva Martinez', email: 'eva@example.com', status: 'active', role: 'Engineer', department: 'Engineering', salary: 105000, hireDate: '2019-11-30', performance: 0.89, isVerified: true, notes: 'Backend lead', alerts: null },
  { id: 6, name: 'Frank Brown', email: 'frank@example.com', status: 'active', role: 'DevOps', department: 'Engineering', salary: 110000, hireDate: '2021-02-14', performance: 0.91, isVerified: true, notes: 'Infrastructure expert', alerts: null },
  { id: 7, name: 'Grace Lee', email: 'grace@example.com', status: 'pending', role: 'Designer', department: 'Design', salary: 80000, hireDate: '2024-01-08', performance: 0.85, isVerified: false, notes: 'New hire onboarding', alerts: ['Equipment pending'] },
  { id: 8, name: 'Henry Taylor', email: 'henry@example.com', status: 'active', role: 'Manager', department: 'Operations', salary: 130000, hireDate: '2018-05-20', performance: 0.94, isVerified: true, notes: 'Department head', alerts: null },
  { id: 9, name: 'Iris Chen', email: 'iris@example.com', status: 'active', role: 'Engineer', department: 'Engineering', salary: 98000, hireDate: '2022-09-12', performance: 0.87, isVerified: true, notes: 'Frontend specialist', alerts: null },
  { id: 10, name: 'Jack Robinson', email: 'jack@example.com', status: 'inactive', role: 'Analyst', department: 'Finance', salary: 72000, hireDate: '2023-03-25', performance: 0.65, isVerified: true, notes: 'Contract ended', alerts: ['Exit interview pending'] },
  { id: 11, name: 'Kate Williams', email: 'kate@example.com', status: 'active', role: 'Engineer', department: 'Engineering', salary: 102000, hireDate: '2021-08-18', performance: 0.90, isVerified: true, notes: 'Full-stack developer', alerts: null },
  { id: 12, name: 'Liam Anderson', email: 'liam@example.com', status: 'active', role: 'DevOps', department: 'Engineering', salary: 108000, hireDate: '2020-04-05', performance: 0.93, isVerified: true, notes: 'Cloud architect', alerts: null },
]

const users = ref<User[]>(mockUsers)

// ---------------------------------------------------------------------------
// ALL COLUMN DEFINITIONS
// ---------------------------------------------------------------------------
const allColumns = ref<TableColumn[]>([
  { key: 'name', label: 'Name', sortable: true, searchable: true, width: '180px' },
  { key: 'email', label: 'Email', sortable: true, searchable: true, width: '200px' },
  { key: 'status', label: 'Status', sortable: true, width: '100px', align: 'center' },
  { key: 'role', label: 'Role', sortable: true, searchable: true, width: '120px' },
  { key: 'department', label: 'Dept', sortable: true, width: '120px' },
  { key: 'salary', label: 'Salary', sortable: true, width: '100px', align: 'right' },
  { key: 'hireDate', label: 'Hire Date', sortable: true, width: '110px' },
  { key: 'performance', label: 'Perf', sortable: true, width: '80px', align: 'right' },
  { key: 'isVerified', label: 'Verified', width: '80px', align: 'center' },
  { key: 'alerts', label: 'Alerts', width: '70px', align: 'center' },
  { key: 'notes', label: 'Notes', width: '200px' },
  { key: 'actions', label: '', width: '50px', align: 'center' }
])

// ---------------------------------------------------------------------------
// COLUMN GROUPS (Presets)
// Simulating Leasing, Maintenance, Manager views
// ---------------------------------------------------------------------------
const columnGroups: Record<string, ColumnGroup> = {
  all: {
    label: 'All Columns',
    columns: ['name', 'email', 'status', 'role', 'department', 'salary', 'hireDate', 'performance', 'isVerified', 'alerts', 'notes', 'actions']
  },
  leasing: {
    label: 'Leasing View',
    columns: ['name', 'email', 'status', 'department', 'hireDate', 'actions']
  },
  maintenance: {
    label: 'Maintenance View',
    columns: ['name', 'status', 'role', 'alerts', 'notes', 'actions']
  },
  manager: {
    label: 'Manager View',
    columns: ['name', 'role', 'department', 'salary', 'performance', 'isVerified', 'actions']
  }
}

// Use column visibility composable
const {
  visibleColumns,
  currentGroup,
  groupItems,
  setColumnGroup
} = useTableColumns(allColumns, columnGroups, 'all')

// ---------------------------------------------------------------------------
// STATUS COLOR MAPPING
// ---------------------------------------------------------------------------
const statusColors: Record<string, string> = {
  active: 'success',
  pending: 'warning',
  inactive: 'error'
}

// ---------------------------------------------------------------------------
// ROW ACTIONS
// ---------------------------------------------------------------------------
const getRowActions = (row: User) => [[
  {
    label: 'View Profile',
    icon: 'i-heroicons-eye-20-solid',
    click: () => console.log('View:', row.name)
  },
  {
    label: 'Edit',
    icon: 'i-heroicons-pencil-20-solid',
    click: () => console.log('Edit:', row.name)
  },
  {
    label: 'Delete',
    icon: 'i-heroicons-trash-20-solid',
    click: () => console.log('Delete:', row.name)
  }
]]

// ---------------------------------------------------------------------------
// EVENT HANDLERS
// ---------------------------------------------------------------------------
function handleRowClick(row: User, index: number) {
  console.log('Row clicked:', row.name, 'at index', index)
}

function handleSortChange(state: { field: string | null; direction: 'asc' | 'desc' }) {
  console.log('Sort changed:', state)
}

function handlePageChange(page: number) {
  console.log('Page changed:', page)
}

// ---------------------------------------------------------------------------
// SEARCH FILTER (Toolbar Demo)
// ---------------------------------------------------------------------------
const searchQuery = ref('')
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u =>
    u.name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q) ||
    u.department.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="p-6 max-w-[1600px] mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Table Engine Playground
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Kitchen sink demo: sorting, pagination, custom cells, column presets, export.
      </p>
    </div>



    <GenericDataTable
      :data="filteredUsers"
      :columns="visibleColumns"
      row-key="id"
      enable-pagination
      :page-size="5"
      default-sort-field="name"
      clickable
      striped
      enable-export
      export-filename="users-export"
      @row-click="handleRowClick"
      @sort-change="handleSortChange"
      @page-change="handlePageChange"
    >
      <!-- TOOLBAR: Search Input -->
      <template #toolbar>
        <div class="flex items-center gap-4">
          <UInput
            v-model="searchQuery"
            placeholder="Search users..."
            icon="i-heroicons-magnifying-glass-20-solid"
            class="w-64"
          />
          <span class="text-sm text-gray-500">
            {{ filteredUsers.length }} users
          </span>
        </div>
      </template>

      <!-- ACTIONS: Column Presets -->
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 uppercase font-semibold tracking-wider">View:</span>
          <div class="flex gap-1">
            <UButton
              v-for="(group, key) in columnGroups"
              :key="key"
              :label="group.label"
              :variant="currentGroup === key ? 'solid' : 'ghost'"
              :color="currentGroup === key ? 'primary' : 'neutral'"
              size="xs"
              @click="setColumnGroup(key)"
            />
          </div>
        </div>
      </template>

      <!-- CELL: Name as Link -->
      <template #cell-name="{ row, value }">
        <CellsLinkCell
          :value="value"
          :to="`/playground/table?user=${row.id}`"
          color="primary"
        />
      </template>

      <!-- CELL: Status Badge -->
      <template #cell-status="{ value }">
        <CellsBadgeCell
          :text="value"
          :color="statusColors[value] || 'neutral'"
        />
      </template>

      <!-- CELL: Salary as Currency -->
      <template #cell-salary="{ value }">
        <CellsCurrencyCell :value="value" />
      </template>

      <!-- CELL: Hire Date Formatted -->
      <template #cell-hireDate="{ value }">
        <CellsDateCell :value="value" format="short" />
      </template>

      <!-- CELL: Performance as Percent -->
      <template #cell-performance="{ value }">
        <CellsPercentCell :value="value" :decimals="0" />
      </template>

      <!-- CELL: Verified Checkbox -->
      <template #cell-isVerified="{ value }">
        <CellsCheckboxCell :value="value" />
      </template>

      <!-- CELL: Alerts Indicator -->
      <template #cell-alerts="{ value }">
        <CellsAlertCell :alerts="value" />
      </template>

      <!-- CELL: Truncated Notes -->
      <template #cell-notes="{ value }">
        <CellsTruncatedTextCell :value="value" :max-length="25" />
      </template>

      <!-- CELL: Actions Dropdown -->
      <template #cell-actions="{ row }">
        <CellsOptionsCell :row="row" :get-items="getRowActions" />
      </template>

      <!-- EMPTY STATE -->
      <template #empty>
        <div class="flex flex-col items-center gap-2 py-8">
          <UIcon name="i-heroicons-users" class="w-12 h-12 text-gray-300" />
          <p class="text-gray-500">No users match your search</p>
          <UButton
            size="sm"
            variant="soft"
            @click="searchQuery = ''"
          >
            Clear Search
          </UButton>
        </div>
      </template>
    </GenericDataTable>

    <!-- FEATURE CHECKLIST -->
    <div class="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h3 class="font-semibold mb-3">Features Demonstrated</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>Column Sorting (3-state)</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>Pagination</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>Toolbar Search</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>Row Click Events</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>Zebra Striping</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>Column Presets</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>CSV/PDF Export</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>Searchable Icons</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>LinkCell</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>BadgeCell</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>CurrencyCell</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>DateCell</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>PercentCell</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>CheckboxCell</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>AlertCell</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="text-green-500" />
          <span>TruncatedTextCell</span>
        </div>
      </div>
    </div>

    <!-- USAGE NOTES -->
    <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
      <h4 class="font-semibold text-blue-800 dark:text-blue-200 mb-2">Testing Notes</h4>
      <ul class="list-disc list-inside text-blue-700 dark:text-blue-300 space-y-1">
        <li><strong>Sorting:</strong> Click column headers. Cycles: ASC → DESC → None</li>
        <li><strong>Performance Sort:</strong> Click "Perf" header to verify numeric sort works</li>
        <li><strong>Column Presets:</strong> Try "Leasing", "Maintenance", "Manager" buttons</li>
        <li><strong>Export:</strong> Click "Export" dropdown to download CSV or PDF</li>
        <li><strong>Searchable:</strong> Name, Email, and Role show search icon in header</li>
      </ul>
    </div>
  </div>
</template>
