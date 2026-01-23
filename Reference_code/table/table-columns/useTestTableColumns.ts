import { markRaw } from 'vue'
import type { TableColumn } from '../../types/tables'
import LinkCell from '../../components/tableCells/LinkCell.vue'
import CurrencyCell from '../../components/tableCells/CurrencyCell.vue'

/**
 * Defines the columns for the Test Table in the playground.
 * This serves as a reference implementation for the table engine.
 */
export const useTestTableColumns = () => {
  const columns: TableColumn[] = [
    {
      header: 'Unit Code',
      accessorKey: 'unit_code',
      sortable: true,
      width: '120px',
      align: 'left',
      group: ['leasing', 'manager', 'maintenance', 'all'],
      cellRenderer: markRaw(LinkCell),
      cellProps: (row: any) => ({
        to: `/units/${row.id}`,
      }),
      disableRowClick: true, // Prevent row click when clicking the link
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      width: '100px',
      align: 'center',
      group: ['leasing', 'manager', 'maintenance', 'all'],
      // Example of disabling row click for a specific column
      disableRowClick: true, 
      cellClasses: (value: string) => ({
        'text-green-600 font-medium': value === 'Occupied',
        'text-red-600 font-medium': value === 'Vacant',
      }),
    },
    {
      header: 'Market Rent',
      accessorKey: 'market_rent',
      sortable: true,
      width: '120px',
      align: 'right',
      group: ['leasing', 'manager', 'all'],
      cellRenderer: markRaw(CurrencyCell),
    },
    {
      header: 'Bed/Bath',
      accessorKey: 'bed_bath', // This might need a custom getter if data is separate
      sortable: false,
      width: '100px',
      align: 'center',
      group: ['leasing', 'manager', 'maintenance', 'all'],
    },
    {
      header: 'Sq. Ft.',
      accessorKey: 'sq_ft',
      sortable: true,
      width: '100px',
      align: 'right',
      group: ['leasing', 'manager', 'maintenance', 'all'],
    },
  ]

  return {
    columns,
  }
}
