// app/table-columns/amenityHistoryColumns.ts

import { h, markRaw } from 'vue';
import type { TableColumn } from '@/types/tables';

// --- Import Generic Cell Components ---
import DateCell from '@/components/tableCells/DateCell.vue';
import AmountCell from '@/components/tableCells/AmountCell.vue';
import TruncatedTextCell from '@/components/tableCells/TruncatedTextCell.vue';
import UserNameCell from '@/components/tableCells/UserNameCell.vue';
// We will create this new component in the next step
import AmenityChangeStatusCell from '@/components/tableCells/AmenityChangeStatusCell.vue';
/**
 * Defines specific widths for columns for a consistent layout.
 */
export const columnWidths: Record<string, string> = {
  unit: '100px',
  yardi_amenity_name: '250px',
  amenity_amount: '100px',
  amenity_type: '100px',
  change_status: '120px',
  comment: '300px',
  added_by: '150px',
};

export const getColumnWidth = (accessorKey: string): string => {
  return columnWidths[accessorKey] || 'auto';
};

/**
 * Main function that returns the array of column definitions.
 */
export function createColumns(): TableColumn[] {
  return [
    {
      header: 'Unit',
      accessorKey: 'unit',
      sortable: true,
    },
    {
      header: 'Amenity',
      accessorKey: 'yardi_amenity_name',
      sortable: true,
    },
    {
      header: 'Amount',
      accessorKey: 'amenity_amount',
      sortable: true,
      align: 'right',
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Type',
      accessorKey: 'amenity_type',
      sortable: true,
    },
    {
      header: 'Change',
      accessorKey: 'change_status', // A virtual key for our custom component
      sortable: true,
      // This custom cell will show "Added" or "Removed" with the date
      cellRenderer: markRaw(AmenityChangeStatusCell),
    },
    {
      header: 'Comment',
      accessorKey: 'comment',
      sortable: false,
      cellRenderer: (h, { row }) =>
        h(TruncatedTextCell, {
          value: row.comment,
          maxLength: 75,
        }),
    },
    {
      header: 'User',
      accessorKey: 'added_by',
      sortable: true,
      cellRenderer: (h, { row }) =>
        h(UserNameCell, {
          firstName: row.creator_first_name,
          lastName: row.creator_last_name,
        }),
    },
  ];
}

/**
 * Defines groups of columns for different views if needed.
 * For now, we only have one view.
 */
export const columnGroups: Record<string, TableColumn[]> = {
  columns_all: createColumns(),
};
