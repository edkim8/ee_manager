// File: app/table-columns/availablesColumns.ts

import { markRaw, defineAsyncComponent } from 'vue';
import type { TableColumn } from '@/types/tables';

// Import all your cell components
import AmountCell from '@/components/tableCells/AmountCell.vue';
import DateCell from '@/components/tableCells/DateCell.vue';
import PercentCell from '@/components/tableCells/PercentCell.vue';
import UnitAvailableCell from '@/components/tableCells/UnitAvailableCell.vue';
import OptionsCell from '@/components/tableCells/OptionsCell.vue';
import CheckBoxCell from '@/components/tableCells/CheckboxCell.vue';
import AlertCell from '@/components/tableCells/AlertCell.vue';
import ReminderCell from '@/components/tableCells/ReminderCell.vue';
import TruncatedTextCell from '@/components/tableCells/TruncatedTextCell.vue';
import TotalConcessionCell from '@/components/tableCells/TotalConcessionCell.vue';
import MakeReadyCell from '@/components/tableCells/MakeReadyCell.vue';

// Your columnWidths and getColumnWidth are correct and can remain as they are.
export const columnWidths: Record<string, string> = {
  apt_code: '30px',
  unit: '80px',
  alert: '40px',
  unit_type: '80px',
  ut_description: '80px',
  sqft: '30px',
  VC: '30px',
  market_rent: '40px',
  yardi_rent: '40px',
  offered_rent: '60px',
  percent_discount: '60px',
  available_date: '60px',
  notice_date: '60px',
  move_in_date: '60px',
  premove_inspect_date: '60px',
  premove_inspect_done: '30px',
  loss_leader: '30px',
  percentage_discount: '30px',
  make_ready: '50px',
};
export const getColumnWidth = (accessorKey: string): string => {
  return columnWidths[accessorKey] || 'auto';
};

type AmortizeClickHandler = (row: any) => void;

// Define a clear type for the permissions object we will receive.
interface ActionPermissions {
  canEditLeasing?: boolean;
  canEditMaintenance?: boolean;
  isManagerOrAdmin?: boolean;
  isAdmin?: boolean;
}

/**
 * Defines the dropdown menu items. It is now a "pure" function.
 * It receives permissions as an argument and does not call any composables itself.
 */
export const getRowItemsForAvailables = (
  row: any,
  amortizeCallback?: AmortizeClickHandler,
  permissions: ActionPermissions = {}
) => {
  const menuItems: any[][] = [];

  const group1 = [
    {
      label: 'View Details',
      icon: 'i-heroicons-document-text-20-solid',
      to: {
        path: `/availables/${row.available_id}`,
        query: row.unit_id ? { unit_id: row.unit_id } : undefined,
      },
    },
  ];
  if (amortizeCallback) {
    group1.push({
      label: 'Amortize Rent Calendar',
      icon: 'i-heroicons-calendar-days-20-solid',
      // The onSelect handler calls useOverlay. This is the correct pattern.
      onSelect: () => amortizeCallback(row),
    });
  }
  menuItems.push(group1);

  if (row.unit_id) {
    menuItems.push([
      {
        label: 'Amenity History',
        icon: 'i-heroicons-clock-20-solid',
        to: `/apartments/units/${row.unit_id}/unit-amenity-history`,
      },
    ]);
  }

  // This logic now safely uses the permissions passed from the page.
  const editGroup = [];
  if (permissions.canEditLeasing) {
    editGroup.push({
      label: 'Edit Leasing',
      icon: 'i-heroicons-pencil-square-20-solid',
      to: `/availables/${row.available_id}/edit-leasing`,
    });
  }
  if (permissions.canEditMaintenance) {
    editGroup.push({
      label: 'Edit Maintenance',
      icon: 'i-heroicons-wrench-screwdriver-20-solid',
      to: `/availables/${row.available_id}/edit-maintenance`,
    });
  }
  if (permissions.isManagerOrAdmin) {
    editGroup.push({
      label: 'Edit Manager Info',
      icon: 'i-heroicons-user-group-20-solid',
      to: `/availables/${row.available_id}/edit-manager`,
    });
  }
  if (permissions.isAdmin) {
    editGroup.push({
      label: 'Edit Admin Info',
      icon: 'i-heroicons-user-group-20-solid',
      to: `/availables/${row.available_id}/edit-admin`,
    });
  }
  if (editGroup.length > 0) {
    menuItems.push(editGroup);
  }

  return menuItems;
};

export function createColumns(
  options: {
    amortizeCallback?: AmortizeClickHandler;
    permissions?: ActionPermissions;
  } = {}
) {
  return [
    // {
    //   header: 'APT',
    //   accessorKey: 'apt_code',
    //   sortable: true,
    //   sortOrder: null,
    //   group: ['leasing', 'manager', 'maintenance', 'columns_all'],
    // },
    {
      header: 'Alert',
      accessorKey: 'alert',
      sortable: false,
      sortOrder: null,
      group: ['leasing', 'manager', 'maintenance', 'columns_all'],
      cellRenderer: markRaw(AlertCell),
    },
    {
      header: 'Set',
      accessorKey: 'reminder',
      sortable: false,
      sortOrder: null,
      group: ['leasing', 'manager', 'columns_all'],
      cellRenderer: markRaw(ReminderCell),
      cellProps: () => ({
        refresh: options.refresh,
      }),
    },
    {
      header: 'Unit',
      accessorKey: 'unit',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'maintenance', 'list', 'columns_all'],
      cellRenderer: markRaw(UnitAvailableCell),
    },
    {
      header: 'Type',
      accessorKey: 'unit_type',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'maintenance', 'columns_all'],
    },
    {
      header: 'UT_Description',
      accessorKey: 'ut_description',
      sortable: false,
      sortOrder: null,
      group: ['leasing', 'list', 'columns_all'],
      cellRenderer: markRaw(TruncatedTextCell),
    },
    {
      header: 'SF',
      accessorKey: 'sqft',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'maintenance', 'list', 'columns_all'],
    },
    {
      header: 'VT Days',
      accessorKey: 'VC',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'columns_all'],
    },
    {
      header: 'LS Days',
      accessorKey: 'LS',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'columns_all'],
    },
    {
      header: 'TO',
      accessorKey: 'make_ready',
      sortable: false,
      sortOrder: null,
      group: ['maintenance', 'manager', 'columns_all'],
      cellRenderer: markRaw(MakeReadyCell),
    },
    {
      header: 'TO Days',
      accessorKey: 'TO',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'maintenance', 'columns_all'],
    },

    {
      header: 'Market',
      accessorKey: 'market_rent',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'list', 'columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Y_Rent',
      accessorKey: 'yardi_rent',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'list', 'columns_all'],
      cellRenderer: markRaw(AmountCell),
      cellProps: (row) => ({
        isRentCorrect: row.is_rent_correct,
      }),
    },
    {
      header: 'W_Rent',
      accessorKey: 'offered_rent',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'columns_all'],
      cellRenderer: markRaw(AmountCell),
      cellProps: (row) => ({
        isRentCorrect: row.is_rent_correct,
      }),
    },

    {
      header: '% Adj',
      accessorKey: 'percent_discount',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'list', 'columns_all'],
      cellRenderer: markRaw(PercentCell),
    },
     {
      header: 'Tot Con %',
      accessorKey: 'total_concession',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'list', 'columns_all'],
      cellRenderer: markRaw(TotalConcessionCell),
    },
    {
      header: 'Notice',
      accessorKey: 'notice_date',
      sortable: true,
      sortOrder: null,
      group: ['maintenance', 'columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Applied',
      accessorKey: 'applied_date',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Available',
      accessorKey: 'available_date',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'maintenance', 'list', 'columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Move Out Date',
      accessorKey: 'move_out_date',
      sortable: true,
      sortOrder: null,
      group: ['maintenance', 'columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
    },
    {
      header: 'Occupancy',
      accessorKey: 'occupancy_status',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
    },
    {
      header: 'AI Rent',
      accessorKey: 'recommended_rent',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'AI Conc',
      accessorKey: 'recommended_concession',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: '% AI',
      accessorKey: 'total_recommended_discount',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'columns_all'],
      cellRenderer: markRaw(PercentCell),
    },
    {
      header: 'Match',
      accessorKey: 'match',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(CheckBoxCell),
    },
    {
      header: 'Active',
      accessorKey: 'active',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(CheckBoxCell),
    },
    // Leasing columns
    {
      header: 'Move In Date',
      accessorKey: 'move_in_date',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'maintenance', 'columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Lease Start',
      accessorKey: 'lease_from_date',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Lease End',
      accessorKey: 'lease_to_date',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Application',
      accessorKey: 'application_date',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Screening',
      accessorKey: 'screen_date',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Screening_last_update',
      accessorKey: 'screening_last_updated',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'Screen Result',
      accessorKey: 'screening_result',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
    },
    {
      header: 'Base Rent',
      accessorKey: 'base_rent',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Fixed',
      accessorKey: 'sum_fixed_amenities',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Discount',
      accessorKey: 'sum_discount_amenities',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Premium',
      accessorKey: 'sum_premium_amenities',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Rent Adj',
      accessorKey: 'rent_adjustment',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'list', 'columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Upfront Disc',
      accessorKey: 'upfront_concession',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'list', 'columns_all'],
      cellRenderer: markRaw(AmountCell),
    },
    {
      header: 'Free Days',
      accessorKey: 'free_days',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'manager', 'list', 'columns_all'],
    },
    {
      header: 'Guest',
      accessorKey: 'guest',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
    },
    {
      header: 'Resident',
      accessorKey: 'resident_name',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
    },
    {
      header: 'Resident Yardi',
      accessorKey: 'resident_code',
      sortable: true,
      sortOrder: null,
      group: ['columns_all'],
    },
    {
      header: 'Agent',
      accessorKey: 'agent',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'columns_all'],
    },
    {
      header: 'Loss Leader',
      accessorKey: 'loss_leader',
      sortable: true,
      sortOrder: null,
      group: ['leasing', 'list', 'columns_all'],
      cellRenderer: markRaw(CheckBoxCell),
    },
    {
      header: 'LL Notes',
      accessorKey: 'loss_leader_special',
      sortable: true,
      sortOrder: null,
      group: ['list', 'columns_all'],
    },
    {
      header: 'Specials',
      accessorKey: 'specials',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'list', 'columns_all'],
    },
    {
      header: 'Comments',
      accessorKey: 'comments',
      sortable: true,
      sortOrder: null,
      group: ['manager', 'maintenance', 'list', 'columns_all'],
    },
    // Maintenance columns
    {
      header: 'PM Inspection',
      accessorKey: 'premove_inspect_date',
      sortable: true,
      sortOrder: null,
      group: ['maintenance', 'columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'PMI',
      accessorKey: 'premove_inspect_done',
      sortable: true,
      sortOrder: null,
      group: ['maintenance', 'columns_all'],
      cellRenderer: markRaw(CheckBoxCell),
    },
    {
      header: 'MO Inspection',
      accessorKey: 'move_out_inspect_date',
      sortable: true,
      sortOrder: null,
      group: ['maintenance', 'columns_all'],
      cellRenderer: markRaw(DateCell),
    },
    {
      header: 'MOI',
      accessorKey: 'move_out_inspect_done',
      sortable: true,
      sortOrder: null,
      group: ['maintenance', 'columns_all'],
      cellRenderer: markRaw(CheckBoxCell),
    },
    {
      header: 'Assignee',
      accessorKey: 'to_assigned_to',
      sortable: true,
      sortOrder: null,
      group: ['maintenance', 'columns_all'],
    },
    {
      header: 'Note',
      accessorKey: 'notes',
      group: ['manager', 'maintenance', 'columns_all'],
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      align: 'center',
      group: ['leasing', 'manager', 'maintenance', 'columns_all'],
      cellRenderer: markRaw(OptionsCell),
      cellProps: () => ({
        getRowItems: (row: any) =>
          getRowItemsForAvailables(
            row,
            options.amortizeCallback,
            options.permissions
          ),
      }),
    },
  ];
}

export const columnGroups: Record<string, TableColumn[]> = {
  columns_all: createColumns().filter((col) =>
    col.group?.includes('columns_all')
  ),
  leasing: createColumns().filter((col) => col.group?.includes('leasing')),
  maintenance: createColumns().filter((col) =>
    col.group?.includes('maintenance')
  ),
  manager: createColumns().filter((col) => col.group?.includes('manager')),
  list: createColumns().filter((col) => col.group?.includes('list')),
};
