import { markRaw } from 'vue'
import type { TableColumn } from '../../types/tables'
import CurrencyCell from '../../components/tableCells/CurrencyCell.vue'
import DateCell from '../../components/tableCells/DateCell.vue'
import PercentCell from '../../components/tableCells/PercentCell.vue'
import CheckboxCell from '../../components/tableCells/CheckboxCell.vue'
import BadgeCell from '../../components/tableCells/BadgeCell.vue'
import TruncatedTextCell from '../../components/tableCells/TruncatedTextCell.vue'
import AlertCell from '../../components/tableCells/AlertCell.vue'
import OptionsCell from '../../components/tableCells/OptionsCell.vue'

/**
 * Comprehensive column definitions to test all custom cell components.
 * This serves as both a test suite and documentation for the cell components.
 */
export const useCellTestColumns = () => {
  const columns: TableColumn[] = [
    {
      header: 'ID',
      accessorKey: 'id',
      sortable: true,
      width: '80px',
      align: 'left',
    },
    {
      header: 'Name',
      accessorKey: 'name',
      sortable: true,
      width: '150px',
      align: 'left',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      width: '120px',
      align: 'center',
      cellRenderer: markRaw(BadgeCell),
      cellProps: (row: any) => ({
        text: row.status,
        color: row.status === 'Active' ? 'green' : row.status === 'Pending' ? 'yellow' : 'gray',
      }),
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      width: '120px',
      align: 'right',
      cellRenderer: markRaw(CurrencyCell),
      cellProps: (row: any) => ({
        isError: !row.amount_verified,
      }),
    },
    {
      header: 'Completion',
      accessorKey: 'completion_percent',
      sortable: true,
      width: '100px',
      align: 'right',
      cellRenderer: markRaw(PercentCell),
    },
    {
      header: 'Active',
      accessorKey: 'is_active',
      sortable: true,
      width: '80px',
      align: 'center',
      cellRenderer: markRaw(CheckboxCell),
    },
    {
      header: 'Created',
      accessorKey: 'created_date',
      sortable: true,
      width: '100px',
      align: 'left',
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Description',
      accessorKey: 'description',
      sortable: false,
      width: '200px',
      align: 'left',
      cellRenderer: markRaw(TruncatedTextCell),
      cellProps: () => ({
        maxLength: 40,
      }),
    },
    {
      header: 'Alerts',
      accessorKey: 'alerts',
      sortable: false,
      width: '80px',
      align: 'center',
      cellRenderer: markRaw(AlertCell),
      cellProps: (row: any) => ({
        alerts: row.alerts,
      }),
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      sortable: false,
      width: '80px',
      align: 'center',
      disableRowClick: true,
      cellRenderer: markRaw(OptionsCell),
      cellProps: () => ({
        getRowItems: (row: any) => [
          [
            {
              label: 'View Details',
              icon: 'i-heroicons-eye',
              click: () => console.log('View:', row),
            },
            {
              label: 'Edit',
              icon: 'i-heroicons-pencil',
              click: () => console.log('Edit:', row),
            },
          ],
          [
            {
              label: 'Delete',
              icon: 'i-heroicons-trash',
              click: () => console.log('Delete:', row),
            },
          ],
        ],
      }),
    },
  ]

  return { columns }
}
