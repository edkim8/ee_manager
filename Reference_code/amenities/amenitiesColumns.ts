// app/table-columns/amenitiesColumns.ts
import type { TableColumn } from '@/types/tables';
import AmountCell from '@/components/tableCells/AmountCell.vue';
import { markRaw } from 'vue';

export const getColumnWidth = (accessorKey: string): string => 'auto';

export function createColumns(): TableColumn[] {
  return [
    {
      header: 'APT',
      accessorKey: 'apt_code',
      sortable: true,
      sortOrder: null,
    },
    { header: 'Name', accessorKey: 'yardi_amenity_name', sortable: true },
    { header: 'Type', accessorKey: 'amenity_type', sortable: true },
    {
      header: 'Amount',
      accessorKey: 'amenity_amount',
      sortable: true,
      align: 'right',
      cellRenderer: markRaw(AmountCell),
    },
  ];
}

export const columnGroups: Record<string, TableColumn[]> = {
  columns_all: createColumns(),
};
