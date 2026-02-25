<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAsyncData, useToast, definePageMeta } from '#imports'
import { usePropertyState } from '../../../base/composables/usePropertyState'
import { allColumns } from '../../../../configs/table-configs/property_ownership-complete.generated'
import { filterColumnsByAccess } from '../../../table/composables/useTableColumns'

definePageMeta({
  layout: 'dashboard',
  middleware: ['owners']
})

const toast = useToast()
const { activeProperty, userContext } = usePropertyState()

// --- Data ---
const { data: rows, status, refresh } = await useAsyncData('property-ownership', () =>
  $fetch('/api/owners/property-ownership'),
  { server: false }
)

const { data: entities } = await useAsyncData('ownership-entities-list', () =>
  $fetch('/api/owners/entities'),
  { server: false }
)

const { data: propertiesData } = await useAsyncData('properties-list', () =>
  $fetch('/api/owners/properties'),
  { server: false }
)

// --- Table columns ---
const columns = computed(() =>
  filterColumnsByAccess(allColumns, {
    userRole: activeProperty.value ? userContext.value?.access?.property_roles?.[activeProperty.value] : null,
    userDepartment: userContext.value?.profile?.department,
    isSuperAdmin: !!userContext.value?.access?.is_super_admin,
    filterGroup: 'all'
  })
)

// --- Computed totals per property for validation feedback ---
const equityByProperty = computed(() => {
  const map = new Map<string, number>()
  for (const r of (rows.value as any[] || [])) {
    map.set(r.property_id, (map.get(r.property_id) || 0) + Number(r.equity_pct))
  }
  return map
})

// --- Modal ---
const showModal  = ref(false)
const isCreating = ref(false)
const saving     = ref(false)
const deleting   = ref<string | null>(null)

const emptyForm = () => ({
  id:          '',
  entity_id:   '',
  property_id: '',
  equity_pct:  0,
  notes:       '',
})

const form = ref(emptyForm())

function openCreate() {
  form.value = emptyForm()
  isCreating.value = true
  showModal.value  = true
}

function openEdit(row: any) {
  form.value = {
    id:          row.id,
    entity_id:   row.entity_id,
    property_id: row.property_id,
    equity_pct:  row.equity_pct,
    notes:       row.notes || '',
  }
  isCreating.value = false
  showModal.value  = true
}

async function save() {
  if (!form.value.entity_id)   { toast.add({ title: 'Validation', description: 'Select an entity.', color: 'warning' }); return }
  if (!form.value.property_id) { toast.add({ title: 'Validation', description: 'Select a property.', color: 'warning' }); return }

  saving.value = true
  try {
    if (isCreating.value) {
      await $fetch('/api/owners/property-ownership', { method: 'POST', body: form.value })
      toast.add({ title: 'Created', description: 'Ownership record added.', color: 'success' })
    } else {
      await $fetch(`/api/owners/property-ownership/${form.value.id}`, { method: 'PATCH', body: form.value })
      toast.add({ title: 'Saved', description: 'Ownership record updated.', color: 'success' })
    }
    showModal.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Save failed.', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(row: any) {
  deleting.value = row.id
  try {
    await $fetch(`/api/owners/property-ownership/${row.id}`, { method: 'DELETE' })
    toast.add({ title: 'Removed', description: `${row.entity_name} removed from ${row.property_code}.`, color: 'success' })
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err?.data?.statusMessage || 'Delete failed.', color: 'error' })
  } finally {
    deleting.value = null
  }
}

// --- Helpers ---
const entityItems = computed(() =>
  (entities.value as any[] || []).map((e: any) => ({ label: e.name, value: e.id }))
)

const propertyItems = computed(() =>
  (propertiesData.value as any[] || []).map((p: any) => ({ label: `${p.code} — ${p.name}`, value: p.id }))
)

function equityTotalColor(propertyId: string): string {
  const total = equityByProperty.value.get(propertyId) || 0
  if (total === 100) return 'text-green-600 dark:text-green-400'
  if (total > 100)   return 'text-red-600 dark:text-red-400'
  return 'text-amber-600 dark:text-amber-400'
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-baseline gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Property Ownership</h1>
        <span class="text-lg text-gray-500 font-medium">· {{ (rows as any[])?.length || 0 }} records</span>
      </div>
      <UButton icon="i-heroicons-plus" label="Add Record" color="primary" @click="openCreate" />
    </div>

    <!-- Equity totals per property -->
    <div v-if="(rows as any[])?.length" class="mb-4 flex flex-wrap gap-3">
      <div
        v-for="[propId, total] in equityByProperty"
        :key="propId"
        class="flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800"
      >
        <span class="text-gray-600 dark:text-gray-400">
          {{ (rows as any[]).find((r: any) => r.property_id === propId)?.property_code }}
        </span>
        <span :class="equityTotalColor(propId)">{{ total.toFixed(2) }}%</span>
        <UIcon
          v-if="total === 100"
          name="i-heroicons-check-circle"
          class="w-4 h-4 text-green-500"
        />
        <UIcon
          v-else-if="total > 100"
          name="i-heroicons-exclamation-circle"
          class="w-4 h-4 text-red-500"
        />
        <UIcon
          v-else
          name="i-heroicons-clock"
          class="w-4 h-4 text-amber-500"
        />
      </div>
    </div>

    <ClientOnly>
      <GenericDataTable
        :data="(rows as any[]) || []"
        :columns="columns"
        :loading="status === 'pending'"
        row-key="id"
        default-sort-field="property_code"
        striped
      >
        <!-- Property -->
        <template #cell-property_code="{ row }">
          <div>
            <span class="font-semibold text-gray-900 dark:text-white">{{ row.property_code }}</span>
            <span class="ml-2 text-xs text-gray-500">{{ row.property_name }}</span>
          </div>
        </template>

        <!-- Entity -->
        <template #cell-entity_name="{ value }">
          <span class="font-medium">{{ value }}</span>
        </template>

        <!-- Equity % -->
        <template #cell-equity_pct="{ value, row }">
          <span class="font-mono text-sm" :class="equityTotalColor(row.property_id)">
            {{ Number(value).toFixed(2) }}%
          </span>
        </template>

        <!-- Notes -->
        <template #cell-notes="{ value }">
          <span v-if="value" class="text-sm text-gray-500 italic">{{ value }}</span>
          <span v-else class="text-gray-400">—</span>
        </template>

        <!-- Actions -->
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="ghost"
              size="sm"
              @click.stop="openEdit(row)"
            />
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="sm"
              :loading="deleting === row.id"
              @click.stop="remove(row)"
            />
          </div>
        </template>
      </GenericDataTable>
    </ClientOnly>

    <!-- Add / Edit Modal -->
    <SimpleModal
      v-model="showModal"
      :title="isCreating ? 'Add Ownership Record' : 'Edit Ownership Record'"
      width="w-full max-w-lg"
    >
      <form class="space-y-5" @submit.prevent="save">
        <UFormField label="Ownership Entity" required>
          <USelectMenu
            v-model="form.entity_id"
            :items="entityItems"
            value-key="value"
            placeholder="Select entity"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Property" required>
          <USelectMenu
            v-model="form.property_id"
            :items="propertyItems"
            value-key="value"
            placeholder="Select property"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Equity %" required>
          <UInput
            v-model.number="form.equity_pct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="e.g. 85.00"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Notes">
          <UInput
            v-model="form.notes"
            placeholder="Optional notes"
            class="w-full"
          />
        </UFormField>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showModal = false" />
          <UButton
            color="primary"
            :loading="saving"
            :label="isCreating ? 'Add Record' : 'Save Changes'"
            icon="i-heroicons-check"
            @click="save"
          />
        </div>
      </template>
    </SimpleModal>
  </div>
</template>
