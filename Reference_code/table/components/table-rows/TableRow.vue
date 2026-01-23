<script setup lang="ts">
import { h, computed } from 'vue'
import type { TableColumn } from '../../types/tables'

const props = defineProps({
  row: {
    type: Object as () => Record<string, any>,
    required: true,
  },
  visibleColumns: {
    type: Array as () => TableColumn[],
    required: true,
  },
  getColumnWidth: {
    type: Function as () => (key: string) => string,
    required: true,
  },
  isClickable: {
    type: Boolean,
    default: true,
  },
  // New prop for row index to apply even/odd shading
  rowIndex: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['row-click', 'amortize'])

function onCellAction(row: any) {
  console.log(
    '[TableRow] Caught "amortize" event. Re-emitting with row data:',
    props.row
  )
  emit('amortize', row)
}

const getNestedValue = (obj: any, path: string): any => {
  if (!path || typeof path !== 'string') return null
  return path
    .split('.')
    .reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj)
}

// Compute row class for even shading
const rowClass = computed(() => ({
  // Even rows (now white to contrast with header)
  'bg-white dark:bg-gray-900': props.rowIndex % 2 === 0,
  // Odd rows (now shaded)
  'bg-gray-50 dark:bg-gray-800': props.rowIndex % 2 !== 0,
  // Clickable hover
  'cursor-pointer hover:bg-gray-200/50 dark:hover:bg-gray-800/50': props.isClickable,
}))
</script>

<template>
  <tr
    @click="isClickable && emit('row-click', row)"
    :class="rowClass"
  >
    <td
      v-for="column in visibleColumns"
      :key="String(column.accessorKey)"
      class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200"
      :class="column.cellClass"
      :style="{
        width: getColumnWidth(String(column.accessorKey)),
        textAlign: column.align || 'left',
      }"
      @click="column.disableRowClick && $event.stopPropagation()"
    >
      <component
        v-if="typeof column.cellRenderer === 'function'"
        :is="
          column.cellRenderer(h, {
            row: row,
            value: getNestedValue(row, String(column.accessorKey)),
          })
        "
      />
      <component
        v-else-if="column.cellRenderer"
        :is="column.cellRenderer"
        :value="getNestedValue(row, String(column.accessorKey))"
        :row="row"
        v-bind="column.cellProps ? column.cellProps(row) : {}"
      />
      <span v-else>{{ getNestedValue(row, String(column.accessorKey)) }}</span>
    </td>
  </tr>
</template>
