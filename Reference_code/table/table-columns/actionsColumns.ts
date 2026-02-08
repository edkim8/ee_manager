// File: app/table-columns/actionsColumns.ts
// Description: A refactored, unified definition for the Action Tracker table columns,
// supporting both a 'full' view and a 'summary' view using a consistent 'group' property.

import { h, markRaw } from 'vue';
import type { TableColumn } from '@/types/tables';

// --- Import all necessary cell components ---
import ActionStatusCell from '@/components/tableCells/ActionStatusCell.vue';
import ActionPriorityCell from '@/components/tableCells/ActionPriorityCell.vue';
import ActionCategoriesCell from '@/components/tableCells/ActionCategoriesCell.vue';
import ActionTitleCell from '@/components/tableCells/ActionTitleCell.vue';
import ActionDueDateCell from '@/components/tableCells/ActionDueDateCell.vue';
import DateCell from '@/components/tableCells/DateCell.vue';
import UserNameCell from '@/components/tableCells/UserNameCell.vue';
import UserArrayCell from '@/components/tableCells/UserArrayCell.vue';
import TruncatedTextCell from '@/components/tableCells/TruncatedTextCell.vue';
import OptionsCell from '@/components/tableCells/OptionsCell.vue';

/**
 * Defines specific widths for the columns for consistent layout.
 */
export const columnWidths: Record<string, string> = {
  title: '300px',
  action_status: '120px',
  action_priority: '100px',
  due_date: '120px',
  assignees: '200px',
  creator: '150px',
  actions: '80px',
};

/**
 * A helper function to get the width for a column.
 */
export const getColumnWidth = (accessorKey: string): string => {
  return columnWidths[accessorKey] || 'auto';
};

/**
 * Defines the menu items for an action row. This remains reusable.
 */
const getRowItemsForActions = (row: any) => [
  [
    {
      label: 'View Details',
      icon: 'i-heroicons-document-text-20-solid',
      to: `/action-tracker/${row.action_id}`,
    },
    {
      label: 'Edit Action',
      icon: 'i-heroicons-pencil-square-20-solid',
      to: `/action-tracker/${row.action_id}/edit`,
    },
  ],
  [
    {
      label: 'Delete Action',
      icon: 'i-heroicons-trash-20-solid',
      labelClass: 'text-red-500 dark:text-red-400',
    },
  ],
];

/**
 * Main function that returns the array of column definitions.
 * It now accepts an options object to generate different views based on a group name.
 * @param {object} options - Options to customize the column set.
 * @param {'full' | 'summary'} [options.groupName='full'] - The group to generate columns for.
 */
export function createColumns(
  options: { groupName?: 'full' | 'summary' } = { groupName: 'full' }
): TableColumn[] {
  // Master list of ALL possible columns.
  // Each column now has a `group` array indicating where it should appear.
  const allColumns: (TableColumn & { group: string[] })[] = [
    {
      id: 'title',
      header: 'Title',
      accessorKey: 'title',
      sortable: true,
      cellRenderer: markRaw(ActionTitleCell),
      group: ['full', 'summary'], // Appears in both groups
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'action_status',
      sortable: true,
      cellRenderer: markRaw(ActionStatusCell),
      group: ['full', 'summary'],
    },
    {
      id: 'priority',
      header: 'Priority',
      accessorKey: 'action_priority',
      sortable: true,
      cellRenderer: markRaw(ActionPriorityCell),
      group: ['full', 'summary'],
    },
    {
      id: 'categories',
      header: 'Categories',
      accessorKey: 'action_categories',
      sortable: false,
      cellRenderer: markRaw(ActionCategoriesCell),
      group: ['full'], // Only appears in the full group
    },
    {
      id: 'due_date',
      header: 'Due Date',
      accessorKey: 'due_date',
      sortable: true,
      cellRenderer: markRaw(DateCell),
      group: ['full'],
    },
    {
      id: 'due_date',
      header: 'Due Date',
      accessorKey: 'due_date',
      sortable: true,
      cellRenderer: markRaw(ActionDueDateCell),
      group: ['summary'],
    },
    {
      id: 'assignees',
      header: 'Assignees',
      accessorKey: 'assignees',
      sortable: false,
      cellRenderer: markRaw(UserArrayCell),
      group: ['full'],
    },
    {
      id: 'creator',
      header: 'Creator',
      accessorKey: 'creator',
      sortable: true,
      cellRenderer: (h, { row }) =>
        h(UserNameCell, {
          firstName: row.creator_first_name,
          lastName: row.creator_last_name,
        }),
      group: ['full'],
    },
    {
      id: 'follow_ups',
      header: 'Follow-ups',
      accessorKey: 'follow_up_count',
      sortable: true,
      align: 'center',
      group: ['full'],
    },
    {
      id: 'actions',
      header: 'Actions',
      accessorKey: 'actions',
      sortable: false,
      align: 'center',
      cellRenderer: (h, { row }) =>
        h(OptionsCell, {
          row: row,
          getRowItems: getRowItemsForActions,
        }),
      group: ['full'], // Only show detailed actions in the full group
    },
  ];

  // Filter the master list based on the requested group name.
  return allColumns.filter((col) =>
    col.group.includes(options.groupName || 'full')
  );
}

// This export can now be used to easily get different column sets.
export const columnGroups: Record<string, TableColumn[]> = {
  columns_all: createColumns({ groupName: 'full' }),
  summary: createColumns({ groupName: 'summary' }),
};
